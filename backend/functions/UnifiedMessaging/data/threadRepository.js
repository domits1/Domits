import Database from "../.shared/integrations/ORM/index.js";
import { UnifiedThread } from "database/models/unified/messaging/UnifiedThread";
import { randomUUID } from "node:crypto";

export const DOMITS_BOOKING_THREAD_UNIQUE_INDEX = "idx_unified_thread_domits_booking_unique";

export const isDomitsBookingThreadUniqueError = (error) => {
  const code = error?.code || error?.driverError?.code;
  if (code !== "23505") return false;

  const constraint = String(error?.constraint || error?.driverError?.constraint || "");
  const detail = String(error?.detail || error?.driverError?.detail || error?.message || "");

  return (
    constraint === DOMITS_BOOKING_THREAD_UNIQUE_INDEX ||
    detail.includes(DOMITS_BOOKING_THREAD_UNIQUE_INDEX) ||
    detail.includes("bookingid") ||
    detail.includes("bookingId")
  );
};

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
        bookingId: data.bookingId ?? null,
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

  async findThread(userId1, userId2, propertyId, bookingId = null) {
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

    if (bookingId === null || bookingId === undefined) {
      qb.andWhere("thread.bookingId IS NULL");
    } else {
      qb.andWhere("thread.bookingId = :bookingId", { bookingId });
    }

    return qb.getOne();
  }

  async findThreadByBookingId(bookingId) {
    if (!bookingId) return null;

    const client = await Database.getInstance();
    return client
      .getRepository(UnifiedThread)
      .createQueryBuilder("thread")
      .where("thread.bookingId = :bookingId", { bookingId })
      .andWhere("thread.platform = :platform", { platform: "DOMITS" })
      .getOne();
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
          bookingId: existing.bookingId ?? null,
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
        bookingId: existing.bookingId ?? null,
        status: status ?? existing.status,
        updatedAt: now,
      };
    }

    return await this.createThread({
      hostId,
      guestId,
      propertyId: propertyId ?? null,
      bookingId: null,
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
