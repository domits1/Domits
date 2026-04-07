import Database from "../ORM/index.js";
import { UnifiedThread } from "../models/unified/messaging/UnifiedThread.js";
import { randomUUID } from "node:crypto";

class ThreadRepository {
  async createThread(data) {
    const client = await Database.getInstance();
    const id = randomUUID();
    const now = Date.now();

    await client
      .createQueryBuilder()
      .insert()
      .into(UnifiedThread)
      .values({
        id,
        hostId: data.hostId,
        guestId: data.guestId,
        propertyId: data.propertyId,
        platform: data.platform,
        externalThreadId: data.externalThreadId,
        status: "OPEN",
        createdAt: now,
        updatedAt: now,
        lastMessageAt: now,
        integrationAccountId: data.integrationAccountId ?? null,
      })
      .execute();

    return {
      id,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getThreadById(id) {
    const client = await Database.getInstance();
    return client.getRepository(UnifiedThread).findOne({ where: { id } });
  }

  async findThread(userId1, userId2, propertyId) {
    const client = await Database.getInstance();

    const qb = client
      .getRepository(UnifiedThread)
      .createQueryBuilder("thread")
      .where(
        "(thread.hostId = :u1 AND thread.guestId = :u2) OR (thread.hostId = :u2 AND thread.guestId = :u1)",
        { u1: userId1, u2: userId2 }
      );

    if (propertyId === null || propertyId === undefined) {
      qb.andWhere("thread.propertyId IS NULL");
    } else {
      qb.andWhere("thread.propertyId = :pId", { pId: propertyId });
    }

    return qb.getOne();
  }

  async findExternalThread({ integrationAccountId, platform, externalThreadId }) {
    const client = await Database.getInstance();
    return client
      .getRepository(UnifiedThread)
      .createQueryBuilder("thread")
      .where("thread.platform = :platform", { platform })
      .andWhere("thread.externalThreadId = :externalThreadId", { externalThreadId })
      .andWhere("thread.integrationAccountId = :integrationAccountId", { integrationAccountId })
      .getOne();
  }

  async upsertExternalThread({ integrationAccountId, platform, externalThreadId, hostId, guestId, propertyId, status }) {
    const client = await Database.getInstance();
    const existing = await this.findExternalThread({ integrationAccountId, platform, externalThreadId });
    const now = Date.now();

    if (existing) {
      await client
        .createQueryBuilder()
        .update(UnifiedThread)
        .set({
          hostId: hostId ?? existing.hostId,
          guestId: guestId ?? existing.guestId,
          propertyId: propertyId ?? existing.propertyId,
          status: status ?? existing.status,
          updatedAt: now,
        })
        .where("id = :id", { id: existing.id })
        .execute();

      return {
        ...existing,
        hostId: hostId ?? existing.hostId,
        guestId: guestId ?? existing.guestId,
        propertyId: propertyId ?? existing.propertyId,
        status: status ?? existing.status,
        updatedAt: now,
      };
    }

    return await this.createThread({
      hostId,
      guestId,
      propertyId: propertyId ?? null,
      platform,
      externalThreadId,
      integrationAccountId,
    });
  }

  async getThreadsForUser(userId) {
    const client = await Database.getInstance();
    return client
      .getRepository(UnifiedThread)
      .createQueryBuilder("thread")
      .where("thread.hostId = :userId OR thread.guestId = :userId", { userId })
      .orderBy("thread.lastMessageAt", "DESC")
      .getMany();
  }

  async updateLastMessageAt(threadId, timestamp) {
    const client = await Database.getInstance();
    await client
      .createQueryBuilder()
      .update(UnifiedThread)
      .set({ lastMessageAt: timestamp, updatedAt: timestamp })
      .where("id = :id", { id: threadId })
      .execute();
  }

  async updateThreadActivity({ threadId, direction, eventAt }) {
    const client = await Database.getInstance();
    const ts = Number(eventAt) || Date.now();

    const patch = {
      lastMessageAt: ts,
      updatedAt: ts,
    };

    if (direction === "INBOUND") patch.lastInboundAt = ts;
    if (direction === "OUTBOUND") patch.lastOutboundAt = ts;

    await client
      .createQueryBuilder()
      .update(UnifiedThread)
      .set(patch)
      .where("id = :id", { id: threadId })
      .execute();
  }
}

export default ThreadRepository;