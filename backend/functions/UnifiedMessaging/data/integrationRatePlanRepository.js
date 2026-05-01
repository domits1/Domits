import Database from "../ORM/index.js";
import { randomUUID } from "node:crypto";

import { ChannelIntegrationRatePlan } from "../models/unified/integrations/ChannelIntegrationRatePlan.js";

class IntegrationRatePlanRepository {
  async upsert({
    integrationAccountId,
    domitsPropertyId,
    externalPropertyId,
    externalRoomTypeId,
    externalRatePlanId,
    externalRatePlanName,
    status,
  }) {
    const client = await Database.getInstance();

    const existing = await client
      .getRepository(ChannelIntegrationRatePlan)
      .createQueryBuilder("r")
      .where("r.integrationAccountId = :a", { a: integrationAccountId })
      .andWhere("r.domitsPropertyId = :d", { d: domitsPropertyId })
      .andWhere("r.externalPropertyId = :p", { p: externalPropertyId })
      .andWhere("r.externalRoomTypeId = :t", { t: externalRoomTypeId })
      .andWhere("r.externalRatePlanId = :e", { e: externalRatePlanId })
      .getOne();

    const now = Date.now();

    if (existing) {
      await client
        .createQueryBuilder()
        .update(ChannelIntegrationRatePlan)
        .set({
          externalRatePlanName: externalRatePlanName ?? existing.externalRatePlanName,
          status: status ?? existing.status,
          updatedAt: now,
        })
        .where("id = :id", { id: existing.id })
        .execute();

      return {
        ...existing,
        externalRatePlanName: externalRatePlanName ?? existing.externalRatePlanName,
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
      externalRatePlanId,
      externalRatePlanName: externalRatePlanName ?? null,
      status: status ?? "ACTIVE",
      createdAt: now,
      updatedAt: now,
    };

    await client.createQueryBuilder().insert().into(ChannelIntegrationRatePlan).values(row).execute();
    return row;
  }

  async listByAccountId(integrationAccountId) {
    const client = await Database.getInstance();
    return client
      .getRepository(ChannelIntegrationRatePlan)
      .createQueryBuilder("r")
      .where("r.integrationAccountId = :a", { a: integrationAccountId })
      .orderBy("r.updatedAt", "DESC")
      .getMany();
  }
}

export default IntegrationRatePlanRepository;
