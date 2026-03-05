import Database from "database";
import { randomUUID } from "node:crypto";

import { ChannelIntegrationAccount } from "../../../ORM/models/unified/integrations/ChannelIntegrationAccount.js";

class IntegrationAccountRepository {
  async create(row) {
    const client = await Database.getInstance();
    await client.createQueryBuilder().insert().into(ChannelIntegrationAccount).values(row).execute();
    return row;
  }

  async listByUserId(userId) {
    const client = await Database.getInstance();
    return client
      .getRepository(ChannelIntegrationAccount)
      .createQueryBuilder("a")
      .where("a.userId = :userId", { userId })
      .orderBy("a.updatedAt", "DESC")
      .getMany();
  }

  async getById(id) {
    const client = await Database.getInstance();
    return client.getRepository(ChannelIntegrationAccount).findOne({ where: { id } });
  }

  async update(id, patch) {
    const client = await Database.getInstance();

    const existing = await this.getById(id);
    if (!existing) return null;

    const next = {
      ...existing,
      externalAccountId: patch.externalAccountId ?? existing.externalAccountId,
      displayName: patch.displayName ?? existing.displayName,
      status: patch.status ?? existing.status,
      credentialsRef: patch.credentialsRef ?? existing.credentialsRef,
      lastErrorCode: patch.lastErrorCode ?? existing.lastErrorCode,
      lastErrorMessage: patch.lastErrorMessage ?? existing.lastErrorMessage,
      updatedAt: Date.now(),
    };

    await client
      .createQueryBuilder()
      .update(ChannelIntegrationAccount)
      .set({
        externalAccountId: next.externalAccountId,
        displayName: next.displayName,
        status: next.status,
        credentialsRef: next.credentialsRef,
        lastErrorCode: next.lastErrorCode,
        lastErrorMessage: next.lastErrorMessage,
        updatedAt: next.updatedAt,
      })
      .where("id = :id", { id })
      .execute();

    return next;
  }

  async touchSyncSuccess(id) {
    const client = await Database.getInstance();
    const ts = Date.now();
    await client
      .createQueryBuilder()
      .update(ChannelIntegrationAccount)
      .set({ lastSuccessfulSyncAt: ts, updatedAt: ts })
      .where("id = :id", { id })
      .execute();
  }

  async touchSyncFailure(id, errorCode, errorMessage) {
    const client = await Database.getInstance();
    const ts = Date.now();
    await client
      .createQueryBuilder()
      .update(ChannelIntegrationAccount)
      .set({
        lastFailedSyncAt: ts,
        lastErrorCode: errorCode ?? null,
        lastErrorMessage: errorMessage ?? null,
        updatedAt: ts,
      })
      .where("id = :id", { id })
      .execute();
  }
}

export default IntegrationAccountRepository;