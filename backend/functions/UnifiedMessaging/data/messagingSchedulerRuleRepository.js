import { randomUUID } from "node:crypto";

import Database from "../ORM/index.js";
import { MessagingSchedulerRule } from "../models/unified/preferences/MessagingSchedulerRule.js";

export default class MessagingSchedulerRuleRepository {
  async listByUserId(userId) {
    const client = await Database.getInstance();
    return client
      .getRepository(MessagingSchedulerRule)
      .createQueryBuilder("rule")
      .where("rule.userId = :userId", { userId })
      .orderBy("rule.updatedAt", "DESC")
      .getMany();
  }

  async listEnabledByUserId(userId) {
    const client = await Database.getInstance();
    return client
      .getRepository(MessagingSchedulerRule)
      .createQueryBuilder("rule")
      .where("rule.userId = :userId", { userId })
      .andWhere("rule.isEnabled = :enabled", { enabled: true })
      .orderBy("rule.updatedAt", "DESC")
      .getMany();
  }

  async listEnabled() {
    const client = await Database.getInstance();
    return client
      .getRepository(MessagingSchedulerRule)
      .createQueryBuilder("rule")
      .where("rule.isEnabled = :enabled", { enabled: true })
      .orderBy("rule.updatedAt", "DESC")
      .getMany();
  }

  async getById(id) {
    const client = await Database.getInstance();
    return client.getRepository(MessagingSchedulerRule).findOne({ where: { id } });
  }

  async create(payload) {
    const client = await Database.getInstance();
    const now = Date.now();
    const row = {
      id: randomUUID(),
      ...payload,
      createdAt: now,
      updatedAt: now,
    };
    await client.createQueryBuilder().insert().into(MessagingSchedulerRule).values(row).execute();
    return row;
  }

  async update(id, patch) {
    const client = await Database.getInstance();
    const existing = await this.getById(id);
    if (!existing) return null;

    const next = {
      ...existing,
      ...patch,
      updatedAt: Date.now(),
    };

    await client
      .createQueryBuilder()
      .update(MessagingSchedulerRule)
      .set({
        name: next.name,
        channel: next.channel,
        templateId: next.templateId,
        triggerType: next.triggerType,
        offsetUnit: next.offsetUnit,
        offsetValue: next.offsetValue,
        isEnabled: next.isEnabled,
        skipIfGuestResponded: next.skipIfGuestResponded,
        updatedAt: next.updatedAt,
      })
      .where("id = :id", { id })
      .execute();

    return next;
  }
}
