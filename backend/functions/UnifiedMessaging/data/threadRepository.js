import Database from "database";
import { UnifiedThread } from "database/models/UnifiedThread";
import { randomUUID } from "crypto";

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
        propertyId: data.propertyId ?? null,
        platform: data.platform,
        externalThreadId: data.externalThreadId ?? null,
        status: "OPEN",
        createdAt: now,
        updatedAt: now,
        lastMessageAt: now,
      })
      .execute();

    return { id, ...data, createdAt: now, updatedAt: now };
  }

  /**
   * NEW:
   * Find thread by normalized participants. Prefer exact (hostId, guestId).
   * If only swapped exists, auto-heal by swapping in DB so future reads are consistent.
   */
  async findThreadNormalized(hostId, guestId, propertyId) {
    const client = await Database.getInstance();
    const repo = client.getRepository(UnifiedThread);

    // helper to apply property filter consistently (NULL-safe)
    const applyPropertyWhere = (qb) => {
      if (propertyId == null) {
        return qb.andWhere("thread.propertyId IS NULL");
      }
      return qb.andWhere("thread.propertyId = :pId", { pId: propertyId });
    };

    // 1) exact match
    let qb = repo
      .createQueryBuilder("thread")
      .where("thread.hostId = :h AND thread.guestId = :g", { h: hostId, g: guestId });

    qb = applyPropertyWhere(qb);

    let thread = await qb.getOne();
    if (thread) return thread;

    // 2) swapped fallback (legacy incorrect rows)
    let qb2 = repo
      .createQueryBuilder("thread")
      .where("thread.hostId = :h AND thread.guestId = :g", { h: guestId, g: hostId });

    qb2 = applyPropertyWhere(qb2);

    thread = await qb2.getOne();
    if (!thread) return null;

    // 3) auto-heal: flip host/guest in DB
    await this.swapThreadParticipants(thread.id, hostId, guestId);

    // return healed thread object (in-memory)
    return {
      ...thread,
      hostId,
      guestId,
    };
  }

  async swapThreadParticipants(threadId, newHostId, newGuestId) {
    const client = await Database.getInstance();
    const now = Date.now();

    await client
      .createQueryBuilder()
      .update(UnifiedThread)
      .set({
        hostId: newHostId,
        guestId: newGuestId,
        updatedAt: now,
      })
      .where("id = :id", { id: threadId })
      .execute();
  }

  // (kept for compatibility, but NOT used anymore by MessageService after patch)
  async findThread(userId1, userId2, propertyId) {
    const client = await Database.getInstance();

    const qb = client
      .getRepository(UnifiedThread)
      .createQueryBuilder("thread")
      .where(
        "(thread.hostId = :u1 AND thread.guestId = :u2) OR (thread.hostId = :u2 AND thread.guestId = :u1)",
        { u1: userId1, u2: userId2 }
      );

    if (propertyId == null) qb.andWhere("thread.propertyId IS NULL");
    else qb.andWhere("thread.propertyId = :pId", { pId: propertyId });

    return qb.getOne();
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
}

export default ThreadRepository;