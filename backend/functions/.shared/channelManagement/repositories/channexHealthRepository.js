import { ChannelIntegrationProperty } from "database/models/unified/integrations/ChannelIntegrationProperty";
import { ChannexBookingRevision } from "database/models/unified/integrations/ChannexBookingRevision";
import { IntegrationSyncState } from "database/models/unified/sync/IntegrationSyncState";

import Database from "../../integrations/ORM/index.js";
import IntegrationAccountRepository from "../../integrations/repositories/integrationAccountRepository.js";
import { toTimeOrNull } from "../utils/dbValues.js";

// Read-only numbers for the health view (#2869, design note section 7) from the tables
// outside the outbox. Everything goes through the query builder on the entities: the
// revision table has quoted camelCase columns, and the others have no create script in
// the repo, so hand-written SQL could name a column that does not exist.

export default class ChannexHealthRepository {
  constructor({ integrationAccounts = new IntegrationAccountRepository() } = {}) {
    this.integrationAccounts = integrationAccounts;
  }

  async lastRevisionAt() {
    const client = await Database.getInstance();
    const row = await client
      .getRepository(ChannexBookingRevision)
      .createQueryBuilder("r")
      .select("MAX(r.createdAt)", "lastRevisionAt")
      .getRawOne();
    return toTimeOrNull(row?.lastRevisionAt);
  }

  async lastPoll() {
    const client = await Database.getInstance();
    const row = await client
      .getRepository(IntegrationSyncState)
      .createQueryBuilder("s")
      .where("s.syncType LIKE :prefix", { prefix: "booking_poll:%" })
      // Postgres sorts NULL first in DESC order, so a row that never ran would win.
      .andWhere("s.lastSyncedAt IS NOT NULL")
      .orderBy("s.lastSyncedAt", "DESC")
      .getOne();
    return { lastPollAt: toTimeOrNull(row?.lastSyncedAt), lastPollStatus: row?.status ?? null };
  }

  // Only the fields the page shows: the account row also holds a credentials reference
  // and the host's user id, which must not reach the browser.
  async accounts() {
    const accounts = await this.integrationAccounts.listByChannel("CHANNEX");
    if (!accounts.length) return [];

    const client = await Database.getInstance();
    const counts = await client
      .getRepository(ChannelIntegrationProperty)
      .createQueryBuilder("p")
      .select("p.integrationAccountId", "integrationAccountId")
      .addSelect("COUNT(*)", "mapped")
      .where("p.integrationAccountId IN (:...ids)", { ids: accounts.map((account) => account.id) })
      .andWhere("UPPER(p.status) = :status", { status: "ACTIVE" })
      .groupBy("p.integrationAccountId")
      .getRawMany();
    const mappedByAccount = new Map(counts.map((row) => [row.integrationAccountId, Number(row.mapped)]));

    return accounts.map((account) => ({
      id: account.id,
      displayName: account.displayName ?? null,
      status: account.status,
      lastErrorCode: account.lastErrorCode ?? null,
      mappedProperties: mappedByAccount.get(account.id) ?? 0,
    }));
  }
}
