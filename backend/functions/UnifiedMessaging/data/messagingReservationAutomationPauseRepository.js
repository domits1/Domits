import { randomUUID } from "node:crypto";

import Database from "../ORM/index.js";
import { MessagingReservationAutomationPause } from "../models/unified/preferences/MessagingReservationAutomationPause.js";

export default class MessagingReservationAutomationPauseRepository {
  async isPaused({ userId, bookingId, schedulerRuleId = null }) {
    const client = await Database.getInstance();
    const qb = client
      .getRepository(MessagingReservationAutomationPause)
      .createQueryBuilder("pause")
      .where("pause.userId = :userId", { userId })
      .andWhere("pause.bookingId = :bookingId", { bookingId })
      .andWhere("pause.isPaused = :isPaused", { isPaused: true });

    if (schedulerRuleId) {
      qb.andWhere("(pause.schedulerRuleId = :schedulerRuleId OR pause.schedulerRuleId IS NULL)", { schedulerRuleId });
    }

    const row = await qb.orderBy("pause.updatedAt", "DESC").getOne();
    return !!row;
  }

  async upsert({ userId, bookingId, schedulerRuleId = null, isPaused = true }) {
    const client = await Database.getInstance();
    const existing = await client
      .getRepository(MessagingReservationAutomationPause)
      .createQueryBuilder("pause")
      .where("pause.userId = :userId", { userId })
      .andWhere("pause.bookingId = :bookingId", { bookingId })
      .andWhere(
        schedulerRuleId ? "pause.schedulerRuleId = :schedulerRuleId" : "pause.schedulerRuleId IS NULL",
        schedulerRuleId ? { schedulerRuleId } : {}
      )
      .getOne();

    const now = Date.now();

    if (existing) {
      await client
        .createQueryBuilder()
        .update(MessagingReservationAutomationPause)
        .set({ isPaused, updatedAt: now })
        .where("id = :id", { id: existing.id })
        .execute();
      return { ...existing, isPaused, updatedAt: now };
    }

    const row = {
      id: randomUUID(),
      userId,
      bookingId,
      schedulerRuleId,
      isPaused,
      createdAt: now,
      updatedAt: now,
    };
    await client.createQueryBuilder().insert().into(MessagingReservationAutomationPause).values(row).execute();
    return row;
  }
}
