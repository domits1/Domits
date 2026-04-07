import IntegrationSyncRepository from "../data/integrationSyncRepository.js";
import IntegrationAccountRepository from "../data/integrationAccountRepository.js";
import { randomUUID } from "node:crypto";

const nowMs = () => Date.now();

export default class SyncRunner {
  constructor() {
    this.syncRepo = new IntegrationSyncRepository();
    this.accountRepo = new IntegrationAccountRepository();
  }

  /**
   * Runs a sync job with state transitions + logs + basic retry.
   *
   * jobFn must return:
   * {
   *   itemsProcessed?: number,
   *   lastCursor?: string|null,
   *   lastSuccessfulItemAt?: number|null
   * }
   */
  async run({ integrationAccountId, syncType, direction = "IMPORT", maxAttempts = 3, jobFn }) {
    const startedAt = nowMs();
    const logId = randomUUID();

    await this.syncRepo.ensureStateRow(integrationAccountId, syncType);

    await this.syncRepo.setState(integrationAccountId, syncType, {
      status: "RUNNING",
      lastSyncedAt: startedAt,
    });

    let attempt = 0;
    let lastErr = null;

    while (attempt < maxAttempts) {
      attempt += 1;

      try {
        const result = (await jobFn({ attempt })) || {};
        const finishedAt = nowMs();

        await this.syncRepo.insertLog({
          id: logId,
          integrationAccountId,
          syncType,
          direction,
          status: "SUCCESS",
          startedAt,
          finishedAt,
          itemsProcessed: result.itemsProcessed ?? 0,
          errorCode: null,
          errorMessage: null,
          details: JSON.stringify({
            attempt,
            note: "sync runner",
            lastCursor: result.lastCursor ?? null,
          }),
        });

        await this.syncRepo.setState(integrationAccountId, syncType, {
          status: "SUCCESS",
          lastCursor: result.lastCursor ?? null,
          lastSyncedAt: finishedAt,
          lastSuccessfulItemAt: result.lastSuccessfulItemAt ?? null,
        });

        await this.accountRepo.touchSyncSuccess(integrationAccountId);

        return {
          ok: true,
          logId,
          itemsProcessed: result.itemsProcessed ?? 0,
          lastCursor: result.lastCursor ?? null,
        };
      } catch (err) {
        lastErr = err;
        const message = err?.message || String(err);
        const code = err?.code || err?.name || "SYNC_FAILED";

        // basic exponential backoff
        const waitMs = Math.min(2000 * attempt, 8000);
        await new Promise((r) => setTimeout(r, waitMs));

        if (attempt >= maxAttempts) {
          const finishedAt = nowMs();

          await this.syncRepo.insertLog({
            id: logId,
            integrationAccountId,
            syncType,
            direction,
            status: "FAILED",
            startedAt,
            finishedAt,
            itemsProcessed: 0,
            errorCode: code,
            errorMessage: message,
            details: JSON.stringify({ attempt, note: "sync runner failed" }),
          });

          await this.syncRepo.setState(integrationAccountId, syncType, {
            status: "FAILED",
            lastSyncedAt: finishedAt,
          });

          await this.accountRepo.touchSyncFailure(integrationAccountId, code, message);

          return {
            ok: false,
            logId,
            errorCode: code,
            errorMessage: message,
          };
        }
      }
    }

    // should not reach
    return {
      ok: false,
      logId,
      errorCode: "SYNC_UNKNOWN",
      errorMessage: lastErr?.message || "Unknown sync error",
    };
  }
}