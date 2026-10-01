import { CHANNEX_ARI_OUTBOX_DEFAULTS } from "../utils/channexAriOutboxConstants.js";
import {
  OUTCOME,
  callTypeOf,
  classifySyncResponse,
  groupChangesForSend,
  nextRetryDelayMs,
  worstOutcome,
} from "../utils/channexAriOutboxPlanning.js";

const SERIALIZATION_FAILURE = "40001";
// Channex counts its call limit per minute.
const CALL_LIMIT_WINDOW_MS = 60_000;
// The Channex rate-limit buckets (availability, restrictions) a set of change types hits.
const bucketsOf = (changeTypes) => [...new Set(changeTypes.map(callTypeOf))].sort();
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
    // Every group ends up in `sends`, also the ones not sent, so every date of every row
    // has an outcome and a date that never went out can't be recorded as sent.
    const sends = [];
    const pausedBuckets = new Map();
    const callsPerBucket = new Map();
    for (const group of groupChangesForSend(rows)) {
      const buckets = bucketsOf(group.changeTypes);

      // After a rate limit or outage, the rest of that call type waits; the other call
      // type has its own Channex limit and still goes out.
      const pausedBucket = buckets.find((bucket) => pausedBuckets.has(bucket));
      if (pausedBucket) {
        const reason = pausedBuckets.get(pausedBucket);
        sends.push({ group, sent: false, result: { outcome: OUTCOME.RETRY, reason, taskIds: [] } });
        continue;
      }

      // A call with several types hits each of their Channex endpoints, so it counts
      // against every bucket it touches. Above the limit the group waits for the next run.
      const limitReached = buckets.some(
        (bucket) => (callsPerBucket.get(bucket) || 0) >= CHANNEX_ARI_OUTBOX_DEFAULTS.MAX_CALLS_PER_BUCKET_PER_RUN
      );
      if (limitReached) {
        sends.push({ group, sent: false, result: { outcome: OUTCOME.DEFERRED, reason: null, taskIds: [] } });
        continue;
      }
      for (const bucket of buckets) callsPerBucket.set(bucket, (callsPerBucket.get(bucket) || 0) + 1);

      const answer = await this.syncCalendarChange(
        { userId: account.userId, domitsPropertyId, source: "CHANNEX_ARI_OUTBOX", ...group },
        { providerRequestTimeoutMs: CHANNEX_ARI_OUTBOX_DEFAULTS.PROVIDER_REQUEST_TIMEOUT_MS }
      );
      const result = classifySyncResponse(answer);
      sends.push({ group, sent: true, result });
      // Only a rate limit or an outage says more calls of this type would fail too; a
      // rejected call (4xx) is about its own values.
      if (result.outcome === OUTCOME.RETRY) {
        for (const bucket of buckets) pausedBuckets.set(bucket, result.reason);
      }
    }

    // Each row gets the worst outcome of the calls that carried its change types on its
    // dates, and the reason of that call; one type can go out in several calls when its
    // dates lie far apart.
    const rowsByResult = new Map();
    const partlySent = new Set();
    for (const row of rows) {
      const [rowFrom, rowTo] = [row.dateFrom, row.dateTo].map(toIsoDate);
      const carriers = sends.filter(
        ({ group }) =>
          group.changeTypes.some((type) => row.changeTypes.includes(type)) &&
          group.changedDates[0] <= rowTo &&
          group.changedDates.at(-1) >= rowFrom
      );
      if (carriers.some(({ sent }) => sent)) partlySent.add(row.id);
      const outcome = carriers.length ? worstOutcome(carriers.map(({ result }) => result.outcome)) : OUTCOME.RETRY;
      const reason = carriers.find(({ result }) => result.outcome === outcome)?.result.reason ?? null;
      const key = `${outcome}|${reason}`;
      if (!rowsByResult.has(key)) rowsByResult.set(key, { outcome, reason, rows: [] });
      rowsByResult.get(key).rows.push(row);
    }

    const now = this.now();
    const recorded = [];
    for (const { outcome, reason, rows: outcomeRows } of rowsByResult.values()) {
      const ids = outcomeRows.map((row) => row.id);
      if (outcome === OUTCOME.PROCESSED) {
        const sentCalls = sends.filter(({ sent }) => sent);
        const taskIds = sentCalls.flatMap(({ result }) => result.taskIds);
        await this.outbox.markProcessed(ids, { now, sentSummary: { taskIds, calls: sentCalls.length } });
        recorded.push(outcome);
      } else if (outcome === OUTCOME.DEFERRED) {
        recorded.push(...(await this.deferRows(outcomeRows, { now, partlySent })));
      } else if (outcome === OUTCOME.SKIPPED) {
        await this.outbox.markSkipped(ids, { now, failureReason: reason });
        recorded.push(outcome);
      } else if (outcome === OUTCOME.FAILED) {
        await this.outbox.markFailed(ids, { now, failureReason: reason });
        recorded.push(outcome);
      } else {
        recorded.push(...(await this.scheduleRetry(outcomeRows, sends, { now, reason, partlySent })));
      }
    }
    return worstOutcome(recorded);
  }


  // Rows the call limit held back wait one minute: while they wait, the claim holds
  // back their call type, so a property never gets two batches of calls within one
  // Channex rate-limit minute, even when two runs handle it seconds apart. A row that
  // was not sent at all gets its attempt back. A row that was partly sent keeps it, so
  // a row too wide to ever fit in one run ends as FAILED instead of sending the
  // maximum number of calls every minute forever.
  async deferRows(rows, { now, partlySent }) {
    const untouched = rows.filter((row) => !partlySent.has(row.id));
    const partial = rows.filter((row) => partlySent.has(row.id));
    const exhausted = partial.filter((row) => (row.attemptCount || 1) >= CHANNEX_ARI_OUTBOX_DEFAULTS.MAX_ATTEMPTS);
    const waiting = partial.filter((row) => (row.attemptCount || 1) < CHANNEX_ARI_OUTBOX_DEFAULTS.MAX_ATTEMPTS);

    const nextAttemptAt = now + CALL_LIMIT_WINDOW_MS;
    const recorded = [];
    if (untouched.length) {
      await this.outbox.release(untouched.map((row) => row.id), { now, nextAttemptAt });
      recorded.push(OUTCOME.DEFERRED);
    }
    if (waiting.length) {
      await this.outbox.returnToPending(waiting.map((row) => row.id), {
        now,
        failureReason: "CHANNEX_CALL_LIMIT",
        nextAttemptAt,
      });
      recorded.push(OUTCOME.DEFERRED);
    }
    if (exhausted.length) {
      await this.outbox.markFailed(exhausted.map((row) => row.id), { now, failureReason: "MAX_ATTEMPTS_EXCEEDED" });
      recorded.push(OUTCOME.FAILED);
    }
    return recorded;
  }

  // Exhaustion is decided per row, so a change on its eighth attempt cannot drag a
  // fresh booking into FAILED with it. Each call type gets its own delay, so a
  // Retry-After on rates does not hold back availability. A row that was never sent
  // (its call type was paused) waits just as long but gets its attempt back.
  async scheduleRetry(rows, sends, { now, reason, partlySent }) {
    const { MAX_ATTEMPTS, RETRY_CAP_MS } = CHANNEX_ARI_OUTBOX_DEFAULTS;
    const recorded = [];
    const exhausted = rows.filter((row) => partlySent.has(row.id) && (row.attemptCount || 1) >= MAX_ATTEMPTS);
    if (exhausted.length) {
      await this.outbox.markFailed(exhausted.map((row) => row.id), { now, failureReason: "MAX_ATTEMPTS_EXCEEDED" });
      recorded.push(OUTCOME.FAILED);
    }

    const waitingByBuckets = new Map();
    for (const row of rows.filter((candidate) => !exhausted.includes(candidate))) {
      const key = bucketsOf(row.changeTypes).join(",");
      waitingByBuckets.set(key, [...(waitingByBuckets.get(key) || []), row]);
    }

    for (const [key, waiting] of waitingByBuckets) {
      const buckets = key.split(",");
      // Channex's Retry-After for these call types wins when it asks for a wait: the
      // longest one, capped at an hour.
      const retryAfterMs = Math.max(
        0,
        ...sends
          .filter(({ group }) => bucketsOf(group.changeTypes).some((bucket) => buckets.includes(bucket)))
          .map(({ result }) => result.retryAfterMs || 0)
      );
      const attempts = Math.max(...waiting.map((row) => row.attemptCount || 1));
      const delayMs = retryAfterMs > 0 ? Math.min(retryAfterMs, RETRY_CAP_MS) : nextRetryDelayMs(attempts, this.random);
      const nextAttemptAt = now + delayMs;

      const tried = waiting.filter((row) => partlySent.has(row.id));
      const untried = waiting.filter((row) => !partlySent.has(row.id));
      if (tried.length) {
        await this.outbox.returnToPending(tried.map((row) => row.id), { now, failureReason: reason, nextAttemptAt });
      }
      if (untried.length) {
        await this.outbox.release(untried.map((row) => row.id), { now, nextAttemptAt });
      }
      recorded.push(OUTCOME.RETRY);
    }
    return recorded;
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
