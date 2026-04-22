import Database from "../ORM/index.js";

import { ChannexSyncEvidence } from "../models/unified/sync/ChannexSyncEvidence.js";

class ChannexSyncEvidenceRepository {
  async create(row) {
    const client = await Database.getInstance();
    await client.createQueryBuilder().insert().into(ChannexSyncEvidence).values(row).execute();
    return row;
  }

  async getById(id) {
    const client = await Database.getInstance();
    return client.getRepository(ChannexSyncEvidence).findOne({ where: { id } });
  }

  async getByIdAndIntegrationAccountId(id, integrationAccountId) {
    const client = await Database.getInstance();
    return client.getRepository(ChannexSyncEvidence).findOne({
      where: {
        id,
        integrationAccountId,
      },
    });
  }

  async listByFilters({ integrationAccountId, domitsPropertyId, syncType, status, dateFrom, dateTo, limit = 50 }) {
    const client = await Database.getInstance();
    const query = client
      .getRepository(ChannexSyncEvidence)
      .createQueryBuilder("e")
      .orderBy("e.startedAt", "DESC")
      .limit(limit);

    if (integrationAccountId) {
      query.andWhere("e.integrationAccountId = :integrationAccountId", { integrationAccountId });
    }

    if (domitsPropertyId) {
      query.andWhere("e.domitsPropertyId = :domitsPropertyId", { domitsPropertyId });
    }

    if (syncType) {
      query.andWhere("e.syncType = :syncType", { syncType });
    }

    if (status) {
      query.andWhere("e.status = :status", { status });
    }

    if (dateFrom) {
      query.andWhere('(e."dateTo" IS NULL OR e."dateTo" >= :dateFrom)', { dateFrom });
    }

    if (dateTo) {
      query.andWhere('(e."dateFrom" IS NULL OR e."dateFrom" <= :dateTo)', { dateTo });
    }

    return query.getMany();
  }
}

export default ChannexSyncEvidenceRepository;
