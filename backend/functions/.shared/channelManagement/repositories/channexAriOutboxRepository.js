import { randomUUID } from "node:crypto";

import { ChannexAriOutbox } from "database/models/channelManagement/ChannexAriOutbox";

import Database from "../../integrations/ORM/index.js";
import {
  CHANNEX_ARI_OUTBOX_DEFAULTS,
  CHANNEX_ARI_OUTBOX_STATUS,
  URGENT_SOURCES,
} from "../utils/channexAriOutboxConstants.js";

const requireStr = (value, field) => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized;
};

const requireDateInt = (value, field) => {
  if (!Number.isInteger(value) || value < 19700101 || value > 99991231) {
    throw new Error(`${field} must be an integer date in YYYYMMDD form.`);
  }
  return value;
};

// Rows come back from raw SQL with lowercase column names; the rest of the code
// works in camelCase, and changeTypes is a list rather than a comma string.
const toRow = (row) => ({
  id: row.id,
  domitsPropertyId: row.domitspropertyid,
  kind: row.kind,
  changeTypes: String(row.changetypes || "")
    .split(",")
    .filter(Boolean),
  dateFrom: Number(row.datefrom),
  dateTo: Number(row.dateto),
  source: row.source,
  attemptCount: Number(row.attemptcount ?? 0),
});

export default class ChannexAriOutboxRepository {
  async table() {
    const client = await Database.getInstance();
    const schema = client?.options?.schema || "main";
    return { client, table: `${schema}.channex_ari_outbox` };
  }

  // Called from inside the caller's transaction, so the row and the domain change
  // commit together or not at all (design D8).
  async insert(manager, { domitsPropertyId, kind, changeTypes, dateFrom, dateTo, source, now = Date.now() }) {
    const types = Array.isArray(changeTypes) ? changeTypes.filter(Boolean) : [];
    if (!types.length) throw new Error("changeTypes must not be empty.");

    const propertyId = requireStr(domitsPropertyId, "domitsPropertyId");
    const rowKind = requireStr(kind, "kind");
    const rowSource = requireStr(source, "source");
    const from = requireDateInt(dateFrom, "dateFrom");
    const to = requireDateInt(dateTo, "dateTo");
    if (to < from) throw new Error("dateTo must not be before dateFrom.");

    const row = {
      id: randomUUID(),
      domitsPropertyId: propertyId,
      kind: rowKind,
      changeTypes: types.join(","),
      dateFrom: from,
      dateTo: to,
      source: rowSource,
      status: CHANNEX_ARI_OUTBOX_STATUS.PENDING,
      attemptCount: 0,
      nextAttemptAt: null,
      failureReason: null,
      sentSummary: null,
      createdAt: now,
      updatedAt: now,
      processedAt: null,
    };

    await manager.createQueryBuilder().insert().into(ChannexAriOutbox).values(row).execute();
    return row;
  }

  // One aggregate per run. A property is ready when none of its rows is waiting for
  // a retry, and it either carries an urgent change (a booking), has been quiet for
  // quietMs, or has been waiting longer than capMs (design D3).
  async findReadyProperties({
    now = Date.now(),
    quietMs = CHANNEX_ARI_OUTBOX_DEFAULTS.QUIET_MS,
    capMs = CHANNEX_ARI_OUTBOX_DEFAULTS.CAP_MS,
    limit = 25,
  } = {}) {
    const { client, table } = await this.table();

    const rows = await client.query(
      `SELECT domitspropertyid,
              MIN(createdat) AS oldestcreatedat
         FROM ${table}
        WHERE status = $1
        GROUP BY domitspropertyid
       HAVING SUM(CASE WHEN nextattemptat IS NOT NULL AND nextattemptat > $2 THEN 1 ELSE 0 END) = 0
          AND (SUM(CASE WHEN source = ANY($3) THEN 1 ELSE 0 END) > 0
               OR MAX(createdat) <= $4
               OR MIN(createdat) <= $5)
        ORDER BY oldestcreatedat ASC
        LIMIT $6`,
      [CHANNEX_ARI_OUTBOX_STATUS.PENDING, now, [...URGENT_SOURCES], now - quietMs, now - capMs, limit]
    );

    return (Array.isArray(rows) ? rows : []).map((row) => ({
      domitsPropertyId: row.domitspropertyid,
      oldestCreatedAt: Number(row.oldestcreatedat),
    }));
  }

  // One conditional UPDATE. On Aurora DSQL two runs that claim the same rows both
  // appear to succeed, and the loser fails at commit with SQLSTATE 40001, which the
  // caller treats as "another run has these rows".
  async claim(domitsPropertyId, { now = Date.now(), runStartedAt = now } = {}) {
    const { client, table } = await this.table();

    const rows = await client.query(
      `UPDATE ${table}
          SET status = $1,
              attemptcount = attemptcount + 1,
              updatedat = $2
        WHERE domitspropertyid = $3
          AND status = $4
          AND createdat <= $5
          AND (nextattemptat IS NULL OR nextattemptat <= $2)
        RETURNING id, domitspropertyid, kind, changetypes, datefrom, dateto, source, attemptcount`,
      [CHANNEX_ARI_OUTBOX_STATUS.PROCESSING, now, domitsPropertyId, CHANNEX_ARI_OUTBOX_STATUS.PENDING, runStartedAt]
    );

    return (Array.isArray(rows) ? rows : []).map(toRow);
  }

  // A PROCESSING row that has not moved for staleMs belongs to a run that died
  // before it could record a result. A worker run cannot outlive the Lambda's
  // 60 seconds, so five minutes cannot catch a run that is still alive.
  async recoverStaleProcessing({ now = Date.now(), staleMs = CHANNEX_ARI_OUTBOX_DEFAULTS.STALE_PROCESSING_MS } = {}) {
    const { client, table } = await this.table();

    const rows = await client.query(
      `UPDATE ${table}
          SET status = $1,
              updatedat = $2
        WHERE status = $3
          AND updatedat <= $4
        RETURNING id`,
      [CHANNEX_ARI_OUTBOX_STATUS.PENDING, now, CHANNEX_ARI_OUTBOX_STATUS.PROCESSING, now - staleMs]
    );

    return Array.isArray(rows) ? rows.length : 0;
  }

  // One UPDATE for the whole claimed batch. processedat is only set when the rows
  // really went out, and an existing sentsummary survives a later failure.
  // expectedStatus guards against marking rows this run no longer holds: a run that
  // was declared stale and recovered must not overwrite what a later run did.
  async #setStatus(
    ids,
    {
      status,
      now,
      failureReason = null,
      nextAttemptAt = null,
      sentSummary = null,
      processed = false,
      expectedStatus = null,
    }
  ) {
    const list = Array.isArray(ids) ? ids.filter(Boolean) : [];
    if (!list.length) return 0;

    const assignments = [
      "status = $1",
      "updatedat = $2",
      "failurereason = $3",
      "sentsummary = COALESCE($4, sentsummary)",
      "nextattemptat = $5",
    ];
    if (processed) assignments.push("processedat = $2");

    const parameters = [
      status,
      now,
      failureReason,
      sentSummary === null ? null : JSON.stringify(sentSummary),
      nextAttemptAt,
      list,
    ];
    let guard = "";
    if (expectedStatus) {
      parameters.push(expectedStatus);
      guard = ` AND status = $${parameters.length}`;
    }

    const { client, table } = await this.table();
    const rows = await client.query(
      `UPDATE ${table} SET ${assignments.join(", ")} WHERE id = ANY($6)${guard} RETURNING id`,
      parameters
    );

    return Array.isArray(rows) ? rows.length : 0;
  }

  async markProcessed(ids, { now = Date.now(), sentSummary = null } = {}) {
    return this.#setStatus(ids, {
      status: CHANNEX_ARI_OUTBOX_STATUS.PROCESSED,
      now,
      sentSummary,
      processed: true,
      expectedStatus: CHANNEX_ARI_OUTBOX_STATUS.PROCESSING,
    });
  }

  async markFailed(ids, { now = Date.now(), failureReason = null } = {}) {
    return this.#setStatus(ids, {
      status: CHANNEX_ARI_OUTBOX_STATUS.FAILED,
      now,
      failureReason,
      expectedStatus: CHANNEX_ARI_OUTBOX_STATUS.PROCESSING,
    });
  }

  async markSkipped(ids, { now = Date.now(), failureReason = null } = {}) {
    return this.#setStatus(ids, { status: CHANNEX_ARI_OUTBOX_STATUS.SKIPPED, now, failureReason });
  }

  async returnToPending(ids, { now = Date.now(), failureReason = null, nextAttemptAt = null } = {}) {
    return this.#setStatus(ids, {
      status: CHANNEX_ARI_OUTBOX_STATUS.PENDING,
      now,
      failureReason,
      nextAttemptAt,
      expectedStatus: CHANNEX_ARI_OUTBOX_STATUS.PROCESSING,
    });
  }

  // Aurora DSQL refuses a transaction that changes more than 3,000 rows, so the
  // delete is capped well under that and whatever is left waits for the next run.
  async cleanup({
    now = Date.now(),
    batch = CHANNEX_ARI_OUTBOX_DEFAULTS.CLEANUP_BATCH,
    processedRetentionMs = CHANNEX_ARI_OUTBOX_DEFAULTS.PROCESSED_RETENTION_MS,
    failedRetentionMs = CHANNEX_ARI_OUTBOX_DEFAULTS.FAILED_RETENTION_MS,
  } = {}) {
    const { client, table } = await this.table();

    const rows = await client.query(
      `DELETE FROM ${table}
        WHERE id IN (
          SELECT id
            FROM ${table}
           WHERE (status = ANY($1) AND updatedat <= $2)
              OR (status = $3 AND updatedat <= $4)
           LIMIT $5
        )
        RETURNING id`,
      [
        [CHANNEX_ARI_OUTBOX_STATUS.PROCESSED, CHANNEX_ARI_OUTBOX_STATUS.SKIPPED],
        now - processedRetentionMs,
        CHANNEX_ARI_OUTBOX_STATUS.FAILED,
        now - failedRetentionMs,
        batch,
      ]
    );

    return Array.isArray(rows) ? rows.length : 0;
  }
}
