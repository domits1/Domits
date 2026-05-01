import Database from "../ORM/index.js";
import { randomUUID } from "node:crypto";

import { ChannelIntegrationRoomType } from "../models/unified/integrations/ChannelIntegrationRoomType.js";

class IntegrationRoomTypeRepository {
  async upsert({
    integrationAccountId,
    domitsPropertyId,
    externalPropertyId,
    externalRoomTypeId,
    externalRoomTypeName,
    status,
  }) {
    const client = await Database.getInstance();

    const existing = await client
      .getRepository(ChannelIntegrationRoomType)
      .createQueryBuilder("r")
      .where("r.integrationAccountId = :a", { a: integrationAccountId })
      .andWhere("r.domitsPropertyId = :d", { d: domitsPropertyId })
      .andWhere("r.externalPropertyId = :p", { p: externalPropertyId })
      .andWhere("r.externalRoomTypeId = :e", { e: externalRoomTypeId })
      .getOne();

    const now = Date.now();

    if (existing) {
      await client
        .createQueryBuilder()
        .update(ChannelIntegrationRoomType)
        .set({
          externalRoomTypeName: externalRoomTypeName ?? existing.externalRoomTypeName,
          status: status ?? existing.status,
          updatedAt: now,
        })
        .where("id = :id", { id: existing.id })
        .execute();

      return {
        ...existing,
        externalRoomTypeName: externalRoomTypeName ?? existing.externalRoomTypeName,
        status: status ?? existing.status,
        updatedAt: now,
      };
    }

    const row = {
      id: randomUUID(),
      integrationAccountId,
      domitsPropertyId,
      externalPropertyId,
      externalRoomTypeId,
      externalRoomTypeName: externalRoomTypeName ?? null,
      status: status ?? "ACTIVE",
      createdAt: now,
      updatedAt: now,
    };

    await client.createQueryBuilder().insert().into(ChannelIntegrationRoomType).values(row).execute();
    return row;
  }

  async listByAccountId(integrationAccountId) {
    const client = await Database.getInstance();
    return client
      .getRepository(ChannelIntegrationRoomType)
      .createQueryBuilder("r")
      .where("r.integrationAccountId = :a", { a: integrationAccountId })
      .orderBy("r.updatedAt", "DESC")
      .getMany();
  }
}

export default IntegrationRoomTypeRepository;
