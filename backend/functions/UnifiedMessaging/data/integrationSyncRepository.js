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
