import Database from "../ORM/index.js";
import { randomUUID } from "node:crypto";

import { ChannelIntegrationProperty } from "../models/unified/integrations/ChannelIntegrationProperty.js";

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
}

export default IntegrationPropertyRepository;
