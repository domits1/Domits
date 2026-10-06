import Database from "../ORM/index.js";
import { randomUUID } from "node:crypto";

import { ChannelIntegrationAccount } from "database/models/unified/integrations/ChannelIntegrationAccount";
import { ChannelIntegrationProperty } from "database/models/unified/integrations/ChannelIntegrationProperty";

class IntegrationPropertyRepository {
  async upsert({ integrationAccountId, domitsPropertyId, externalPropertyId, externalPropertyName, status }) {
    const client = await Database.getInstance();

    const existing = await client
      .getRepository(ChannelIntegrationProperty)
      .createQueryBuilder("p")
      .where("p.integrationAccountId = :a", { a: integrationAccountId })
      .andWhere("p.domitsPropertyId = :d", { d: domitsPropertyId })
      .andWhere("p.externalPropertyId = :e", { e: externalPropertyId })
      .getOne();

    const now = Date.now();

    if (existing) {
      await client
        .createQueryBuilder()
        .update(ChannelIntegrationProperty)
        .set({
          externalPropertyName: externalPropertyName ?? existing.externalPropertyName,
          status: status ?? existing.status,
          updatedAt: now,
        })
        .where("id = :id", { id: existing.id })
        .execute();

      return {
        ...existing,
        externalPropertyName: externalPropertyName ?? existing.externalPropertyName,
        status: status ?? existing.status,
        updatedAt: now,
      };
    }

    const row = {
      id: randomUUID(),
      integrationAccountId,
      domitsPropertyId,
      externalPropertyId,
      externalPropertyName: externalPropertyName ?? null,
      status: status ?? "ACTIVE",
      createdAt: now,
      updatedAt: now,
    };

    await client.createQueryBuilder().insert().into(ChannelIntegrationProperty).values(row).execute();
    return row;
  }

  async listByAccountId(integrationAccountId) {
    const client = await Database.getInstance();
    return client
      .getRepository(ChannelIntegrationProperty)
      .createQueryBuilder("p")
      .where("p.integrationAccountId = :a", { a: integrationAccountId })
      .orderBy("p.updatedAt", "DESC")
      .getMany();
  }

  async listActiveByDomitsPropertyId(domitsPropertyId) {
    const client = await Database.getInstance();
    return client
      .getRepository(ChannelIntegrationProperty)
      .createQueryBuilder("p")
      .where("p.domitsPropertyId = :d", { d: domitsPropertyId })
      .andWhere("p.status = :s", { s: "ACTIVE" })
      .orderBy("p.updatedAt", "DESC")
      .getMany();
  }

  // Same "mapped to Channex" rule as the ARI outbox (channexAriOutboxWriter.isMappedToChannex).
  async findActiveChannexMappingByExternalPropertyId(externalPropertyId) {
    const client = await Database.getInstance();
    const row = await client
      .getRepository(ChannelIntegrationProperty)
      .createQueryBuilder("p")
      .innerJoin(ChannelIntegrationAccount, "a", "a.id = p.integrationAccountId")
      .where("p.externalPropertyId = :e", { e: externalPropertyId })
      .andWhere("UPPER(p.status) = :s", { s: "ACTIVE" })
      .andWhere("UPPER(a.channel) = :c", { c: "CHANNEX" })
      .orderBy("p.updatedAt", "DESC")
      .getOne();
    return row ?? null;
  }
}

export default IntegrationPropertyRepository;
