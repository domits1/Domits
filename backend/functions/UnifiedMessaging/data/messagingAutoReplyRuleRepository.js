import { randomUUID } from "node:crypto";

import Database from "../ORM/index.js";
import { MessagingAutoReplyRule } from "../models/unified/preferences/MessagingAutoReplyRule.js";

export default class MessagingAutoReplyRuleRepository {
  async listByUserId(userId) {
    const client = await Database.getInstance();
    return client
      .getRepository(MessagingAutoReplyRule)
      .createQueryBuilder("rule")
      .where("rule.userId = :userId", { userId })
      .orderBy("rule.updatedAt", "DESC")
      .getMany();
  }

  async getById(id) {
    const client = await Database.getInstance();
    return client.getRepository(MessagingAutoReplyRule).findOne({ where: { id } });
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

    await client.createQueryBuilder().insert().into(MessagingAutoReplyRule).values(row).execute();
    return row;
  }

  async update(id, patch) {
    const client = await Database.getInstance();
    const existing = await this.getById(id);
    if (!existing) return null;

    const next = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: Date.now(),
    };

    await client
      .createQueryBuilder()
      .update(MessagingAutoReplyRule)
      .set({
        name: next.name,
        channel: next.channel,
        keywordPattern: next.keywordPattern,
        replyTemplateId: next.replyTemplateId,
        replyText: next.replyText,
        isEnabled: next.isEnabled,
        updatedAt: next.updatedAt,
      })
      .where("id = :id", { id })
      .execute();

    return next;
  }
}
