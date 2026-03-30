import { randomUUID } from "node:crypto";

import Database from "../ORM/index.js";
import { MessagingTemplate } from "../models/unified/preferences/MessagingTemplate.js";

export default class MessagingTemplateRepository {
  async listByUserId(userId, { includeArchived = true } = {}) {
    const client = await Database.getInstance();
    const qb = client
      .getRepository(MessagingTemplate)
      .createQueryBuilder("template")
      .where("template.userId = :userId", { userId })
      .orderBy("template.updatedAt", "DESC");

    if (!includeArchived) {
      qb.andWhere("template.isArchived = :isArchived", { isArchived: false });
    }

    return qb.getMany();
  }

  async getById(id) {
    const client = await Database.getInstance();
    return client.getRepository(MessagingTemplate).findOne({ where: { id } });
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

    await client.createQueryBuilder().insert().into(MessagingTemplate).values(row).execute();
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
      .update(MessagingTemplate)
      .set({
        name: next.name,
        category: next.category,
        language: next.language,
        content: next.content,
        isArchived: next.isArchived,
        updatedAt: next.updatedAt,
      })
      .where("id = :id", { id })
      .execute();

    return next;
  }
}
