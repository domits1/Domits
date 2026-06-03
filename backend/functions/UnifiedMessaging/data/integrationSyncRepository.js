import Database from "../ORM/index.js";
import { randomUUID } from "node:crypto";

import { IntegrationSyncState } from "../models/unified/sync/IntegrationSyncState.js";
import { IntegrationSyncLog } from "../models/unified/sync/IntegrationSyncLog.js";

class IntegrationSyncRepository {
  async ensureStateRow(integrationAccountId, syncType) {
    const client = await Database.getInstance();
    const existing = await client
      .getRepository(IntegrationSyncState)
      .createQueryBuilder("s")
      .where("s.integrationAccountId = :a", { a: integrationAccountId })
      .andWhere("s.syncType = :t", { t: syncType })
      .getOne();

    if (existing) return existing;

    const now = Date.now();
    const row = {
      id: randomUUID(),
      integrationAccountId,
      syncType,
      lastCursor: null,
      lastSyncedAt: null,
      lastSuccessfulItemAt: null,
      status: "IDLE",
      createdAt: now,
      updatedAt: now,
    };

    await client.createQueryBuilder().insert().into(IntegrationSyncState).values(row).execute();
    return row;
  }

  async setState(integrationAccountId, syncType, patch) {
    const client = await Database.getInstance();
    await this.ensureStateRow(integrationAccountId, syncType);

    const now = Date.now();

    await client
      .createQueryBuilder()
      .update(IntegrationSyncState)
      .set({
        lastCursor: patch.lastCursor ?? undefined,
        lastSyncedAt: patch.lastSyncedAt ?? undefined,
        lastSuccessfulItemAt: patch.lastSuccessfulItemAt ?? undefined,
        status: patch.status ?? undefined,
        updatedAt: now,
      })
      .where("integrationAccountId = :a AND syncType = :t", { a: integrationAccountId, t: syncType })
      .execute();
  }

  async tryAcquireLock(integrationAccountId, syncType, { staleBeforeMs = Date.now() - 300000 } = {}) {
    const client = await Database.getInstance();
    await this.ensureStateRow(integrationAccountId, syncType);

    const now = Date.now();
    const result = await client
      .createQueryBuilder()
      .update(IntegrationSyncState)
      .set({
        status: "RUNNING",
        lastSyncedAt: now,
        updatedAt: now,
      })
      .where("integrationAccountId = :a AND syncType = :t", { a: integrationAccountId, t: syncType })
      .andWhere("(status <> :running OR updatedAt <= :staleBeforeMs)", {
        running: "RUNNING",
        staleBeforeMs,
      })
      .execute();
    const state = await client.getRepository(IntegrationSyncState).findOne({
      where: { integrationAccountId, syncType },
    });

    return {
      acquired: Number(result?.affected || 0) > 0,
      state,
    };
  }

  async releaseLock(integrationAccountId, syncType, { status = "IDLE", lastSyncedAt, lastSuccessfulItemAt } = {}) {
    await this.setState(integrationAccountId, syncType, {
      status,
      lastSyncedAt,
      lastSuccessfulItemAt,
    });
  }

  async insertLog(row) {
    const client = await Database.getInstance();
    await client.createQueryBuilder().insert().into(IntegrationSyncLog).values(row).execute();
    return row;
  }

  async listLogs(integrationAccountId, limit = 50) {
    const client = await Database.getInstance();
    return client
      .getRepository(IntegrationSyncLog)
      .createQueryBuilder("l")
      .where("l.integrationAccountId = :a", { a: integrationAccountId })
      .orderBy("l.startedAt", "DESC")
      .limit(limit)
      .getMany();
  }
}

export default IntegrationSyncRepository;
