import { CHANNEX_ARI_OUTBOX_DEFAULTS } from "../utils/channexAriOutboxConstants.js";
import {
  OUTCOME,
  classifySyncResponse,
  groupChangesForSend,
  nextRetryDelayMs,
  sharesCallType,
  worstOutcome,
} from "../utils/channexAriOutboxPlanning.js";

const SERIALIZATION_FAILURE = "40001";
const lockName = (domitsPropertyId) => `channex_ari:${domitsPropertyId}`;
// Rows store YYYYMMDD integers; calls carry ISO dates, which compare correctly as text.
const toIsoDate = (value) => String(value).replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3");

export default class ChannexAriOutboxWorker {
  constructor({ outbox, props, accounts, sync, schemaGuard, syncCalendarChange, now = Date.now, random = Math.random, log = console }) {
    this.outbox = outbox;
    this.props = props;
    this.accounts = accounts;
    this.sync = sync;
    this.schemaGuard = schemaGuard;
    this.syncCalendarChange = syncCalendarChange;
    this.now = now;
    this.random = random;
    this.log = log;
  }

  // The Channex account connected to this property, or null when there is none.
  async findChannexAccount(domitsPropertyId) {
    const mappings = await this.props.listActiveByDomitsPropertyId(domitsPropertyId);
    for (const mapping of mappings) {
      const account = await this.accounts.getById(mapping.integrationAccountId);
      if (account?.channel === "CHANNEX" && account?.status === "CONNECTED") return account;
    }
    return null;
  }

  async processProperty(domitsPropertyId, { runStartedAt }) {
    const account = await this.findChannexAccount(domitsPropertyId);
    if (!account) {
      const rows = await this.outbox.claim(domitsPropertyId, { now: this.now(), runStartedAt });
      await this.outbox.markSkipped(rows.map((row) => row.id), { now: this.now(), failureReason: "NOT_MAPPED" });
      return OUTCOME.SKIPPED;
    }

    const acquired = await this.tryLock(account.id, domitsPropertyId);
    if (!acquired) return "LOCKED";

    let rows = [];
    try {
      rows = await this.outbox.claim(domitsPropertyId, { now: this.now(), runStartedAt });
      if (!rows.length) return "EMPTY";
      return await this.sendAndRecord(account, domitsPropertyId, rows);
    } catch (error) {
      // The rows are ours but their result is unknown: hand them back straight away
      // instead of waiting five minutes for stale recovery.
      if (rows.length) {
        await this.outbox.returnToPending(rows.map((row) => row.id), { now: this.now(), failureReason: "UNEXPECTED_ERROR" });
      }
      throw error;
    } finally {
      await this.unlock(account.id, domitsPropertyId);
    }
  }

  async sendAndRecord(account, domitsPropertyId, rows) {
    const sends = [];
    const pausedTypes = [];
    for (const group of groupChangesForSend(rows)) {
      // After a failed call, the rest of that call type waits for the next run; the
      // other call type has its own Channex limit and still goes out.
      if (sharesCallType(group.changeTypes, pausedTypes)) continue;
      const answer = await this.syncCalendarChange(
        { userId: account.userId, domitsPropertyId, source: "CHANNEX_ARI_OUTBOX", ...group },
        { providerRequestTimeoutMs: CHANNEX_ARI_OUTBOX_DEFAULTS.PROVIDER_REQUEST_TIMEOUT_MS }
      );
      const result = classifySyncResponse(answer);
      sends.push({ group, result });
      if (result.outcome !== OUTCOME.PROCESSED) pausedTypes.push(...group.changeTypes);
    }

    // Each row gets the worst outcome of the calls that carried its change types on its
    // dates; one type can go out in several calls when its dates lie far apart. A type
    // that was not sent for the row's dates counts as a retry.
    const rowsByOutcome = new Map();
    for (const row of rows) {
      const [rowFrom, rowTo] = [row.dateFrom, row.dateTo].map(toIsoDate);
      const outcomes = row.changeTypes.flatMap((type) => {
        const carriers = sends.filter(
          ({ group }) =>
            group.changeTypes.includes(type) && group.changedDates[0] <= rowTo && group.changedDates.at(-1) >= rowFrom
        );
        return carriers.length ? carriers.map(({ result }) => result.outcome) : [OUTCOME.RETRY];
      });
      const outcome = worstOutcome(outcomes);
      rowsByOutcome.set(outcome, [...(rowsByOutcome.get(outcome) || []), row]);
    }

    const now = this.now();
    const results = sends.map(({ result }) => result);
    const reasonFor = (outcome) => results.find((result) => result.outcome === outcome)?.reason ?? null;
    const recorded = [];
    for (const [outcome, outcomeRows] of rowsByOutcome) {
      const ids = outcomeRows.map((row) => row.id);
      if (outcome === OUTCOME.PROCESSED) {
        const taskIds = results.flatMap((result) => result.taskIds);
        await this.outbox.markProcessed(ids, { now, sentSummary: { taskIds, calls: sends.length } });
        recorded.push(outcome);
      } else if (outcome === OUTCOME.SKIPPED) {
        await this.outbox.markSkipped(ids, { now, failureReason: reasonFor(outcome) });
        recorded.push(outcome);
      } else if (outcome === OUTCOME.FAILED) {
        await this.outbox.markFailed(ids, { now, failureReason: reasonFor(outcome) });
        recorded.push(outcome);
      } else {
        recorded.push(await this.scheduleRetry(outcomeRows, results, { now, reason: reasonFor(outcome) }));
      }
    }
    return worstOutcome(recorded);
  }

  // Exhaustion is decided per row, so a change on its eighth attempt cannot drag a
  // fresh booking into FAILED with it.
  async scheduleRetry(rows, results, { now, reason }) {
    const { MAX_ATTEMPTS, RETRY_CAP_MS } = CHANNEX_ARI_OUTBOX_DEFAULTS;
    const exhausted = rows.filter((row) => (row.attemptCount || 1) >= MAX_ATTEMPTS);
    const waiting = rows.filter((row) => (row.attemptCount || 1) < MAX_ATTEMPTS);

    if (exhausted.length) {
      await this.outbox.markFailed(exhausted.map((row) => row.id), { now, failureReason: "MAX_ATTEMPTS_EXCEEDED" });
    }
    if (!waiting.length) return OUTCOME.FAILED;

    // Channex's Retry-After wins when it asks for a wait: the longest one, capped at an hour.
    const retryAfterMs = Math.max(0, ...results.map((result) => result.retryAfterMs || 0));
    const attempts = Math.max(...waiting.map((row) => row.attemptCount || 1));
    const delayMs = retryAfterMs > 0 ? Math.min(retryAfterMs, RETRY_CAP_MS) : nextRetryDelayMs(attempts, this.random);
    await this.outbox.returnToPending(waiting.map((row) => row.id), {
      now,
      failureReason: reason,
      nextAttemptAt: now + delayMs,
    });
    return OUTCOME.RETRY;
  }

  async tryLock(accountId, domitsPropertyId) {
    try {
      const lock = await this.sync.tryAcquireLock(accountId, lockName(domitsPropertyId), {
        staleBeforeMs: this.now() - CHANNEX_ARI_OUTBOX_DEFAULTS.STALE_PROCESSING_MS,
      });
      return lock?.acquired === true;
    } catch (error) {
      // On Aurora DSQL the loser of two simultaneous lock attempts fails at commit
      // with 40001: another run has the lock.
      if (error?.code === SERIALIZATION_FAILURE) return false;
      throw error;
    }
  }

  async unlock(accountId, domitsPropertyId) {
    try {
      await this.sync.releaseLock(accountId, lockName(domitsPropertyId), { status: "IDLE" });
    } catch (error) {
      // A lock that cannot be released expires after five minutes; that must not
      // hide the real outcome of the run.
      this.log.error("Failed to release the Channex ARI outbox lock", { domitsPropertyId, error: error?.message });
    }
  }

  async run({ timeBudgetMs = 45_000 } = {}) {
    await this.schemaGuard.assertReady();
    const runStartedAt = this.now();

    try {
      await this.outbox.recoverStaleProcessing({ now: runStartedAt });
    } catch (error) {
      // 40001: another run recovered the same rows at the same moment.
      if (error?.code !== SERIALIZATION_FAILURE) throw error;
    }

    const ready = await this.outbox.findReadyProperties({ now: runStartedAt });
    const summary = { properties: ready.length, outcomes: {}, errors: 0, stoppedEarly: false, cleaned: 0 };

    for (const { domitsPropertyId } of ready) {
      // The Lambda stops at 60 seconds; a property started late would be cut off mid-send.
      if (this.now() - runStartedAt >= timeBudgetMs) {
        summary.stoppedEarly = true;
        break;
      }
      try {
        const outcome = await this.processProperty(domitsPropertyId, { runStartedAt });
        summary.outcomes[outcome] = (summary.outcomes[outcome] || 0) + 1;
      } catch (error) {
        summary.errors += 1;
        this.log.error("Channex ARI outbox: property failed", { domitsPropertyId, error: error?.message });
      }
    }

    try {
      summary.cleaned = await this.outbox.cleanup({ now: this.now() });
    } catch (error) {
      this.log.error("Channex ARI outbox: cleanup failed", { error: error?.message });
    }
    return summary;
  }
}
