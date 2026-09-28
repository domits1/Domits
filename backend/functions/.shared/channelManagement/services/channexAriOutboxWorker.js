import { CHANNEX_ARI_OUTBOX_DEFAULTS } from "../utils/channexAriOutboxConstants.js";
import {
  OUTCOME,
  classifySyncResponse,
  groupChangesForSend,
  nextRetryDelayMs,
  worstOutcome,
} from "../utils/channexAriOutboxPlanning.js";

const SERIALIZATION_FAILURE = "40001";
const lockName = (domitsPropertyId) => `channex_ari:${domitsPropertyId}`;

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
    const results = [];
    for (const group of groupChangesForSend(rows)) {
      const answer = await this.syncCalendarChange(
        { userId: account.userId, domitsPropertyId, source: "CHANNEX_ARI_OUTBOX", ...group },
        { providerRequestTimeoutMs: CHANNEX_ARI_OUTBOX_DEFAULTS.PROVIDER_REQUEST_TIMEOUT_MS }
      );
      const classified = classifySyncResponse(answer);
      results.push(classified);
      // A group that did not go through (RETRY/FAILED/SKIPPED) already decides the
      // outcome for every row (see worstOutcome below), so further groups would only
      // send more Channex calls without changing what gets recorded.
      if (classified.outcome !== OUTCOME.PROCESSED) break;
    }

    const outcome = worstOutcome(results.map((result) => result.outcome));
    const reason = results.find((result) => result.outcome === outcome)?.reason ?? null;
    const ids = rows.map((row) => row.id);
    const now = this.now();

    if (outcome === OUTCOME.PROCESSED) {
      const taskIds = results.flatMap((result) => result.taskIds);
      await this.outbox.markProcessed(ids, { now, sentSummary: { taskIds, calls: results.length } });
    } else if (outcome === OUTCOME.SKIPPED) {
      await this.outbox.markSkipped(ids, { now, failureReason: reason });
    } else if (outcome === OUTCOME.FAILED) {
      await this.outbox.markFailed(ids, { now, failureReason: reason });
    } else {
      return this.scheduleRetry(rows, results, { now, reason });
    }
    return outcome;
  }

  // Waits longer after each attempt, or as long as Channex asks, and gives up after
  // MAX_ATTEMPTS so a change that keeps failing ends up FAILED instead of looping.
  async scheduleRetry(rows, results, { now, reason }) {
    const ids = rows.map((row) => row.id);
    const attempts = Math.max(...rows.map((row) => row.attemptCount || 1));
    if (attempts >= CHANNEX_ARI_OUTBOX_DEFAULTS.MAX_ATTEMPTS) {
      await this.outbox.markFailed(ids, { now, failureReason: "MAX_ATTEMPTS_EXCEEDED" });
      return OUTCOME.FAILED;
    }

    const retryAfterMs = results.find((result) => result.outcome === OUTCOME.RETRY)?.retryAfterMs;
    const delayMs = retryAfterMs ?? nextRetryDelayMs(attempts, this.random);
    await this.outbox.returnToPending(ids, { now, failureReason: reason, nextAttemptAt: now + delayMs });
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
