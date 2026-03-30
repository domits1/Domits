import { randomUUID } from "node:crypto";

import Database from "../ORM/index.js";
import { MessagingPreference } from "../models/unified/preferences/MessagingPreference.js";

export default class MessagingPreferenceRepository {
  async getByUserId(userId) {
    const client = await Database.getInstance();
    return client.getRepository(MessagingPreference).findOne({ where: { userId } });
  }

  async upsert(payload) {
    const client = await Database.getInstance();
    const existing = await this.getByUserId(payload.userId);
    const now = Date.now();

    if (existing) {
      const next = {
        ...existing,
        ...payload,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: now,
      };

      await client
        .createQueryBuilder()
        .update(MessagingPreference)
        .set({
          guestMessageEmailEnabled: next.guestMessageEmailEnabled,
          autoReplyEmailEnabled: next.autoReplyEmailEnabled,
          defaultResponseTimeTargetMinutes: next.defaultResponseTimeTargetMinutes,
          businessHoursEnabled: next.businessHoursEnabled,
          businessHoursStart: next.businessHoursStart,
          businessHoursEnd: next.businessHoursEnd,
          outOfOfficeEnabled: next.outOfOfficeEnabled,
          defaultMessageLanguage: next.defaultMessageLanguage,
          updatedAt: next.updatedAt,
        })
        .where("id = :id", { id: existing.id })
        .execute();

      return next;
    }

    const row = {
      id: randomUUID(),
      ...payload,
      createdAt: now,
      updatedAt: now,
    };

    await client.createQueryBuilder().insert().into(MessagingPreference).values(row).execute();
    return row;
  }
}
