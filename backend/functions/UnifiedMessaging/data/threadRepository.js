import Database from "database";
import { UnifiedThread } from "../models/UnifiedThread.js";
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
        id: id,
        hostId: data.hostId,
        guestId: data.guestId,
        propertyId: data.propertyId,
        platform: data.platform,
        externalThreadId: data.externalThreadId,
        status: "OPEN",
        createdAt: now,
        updatedAt: now,
        lastMessageAt: now,
      })
      .execute();

    return {
      id,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
  }

  async findThread(userId1, userId2, propertyId) {
    const client = await Database.getInstance();

    const thread = await client
      .getRepository(UnifiedThread)
      .createQueryBuilder("thread")
      .where("(thread.hostId = :u1 AND thread.guestId = :u2) OR (thread.hostId = :u2 AND thread.guestId = :u1)", {
        u1: userId1,
        u2: userId2,
      })
      .andWhere("thread.propertyId = :pId", { pId: propertyId })
      .getOne();

    return thread;
  }

  async getThreadsForUser(userId) {
    const client = await Database.getInstance();
    const threads = await client
      .getRepository(UnifiedThread)
      .createQueryBuilder("thread")
      .where("thread.hostId = :userId OR thread.guestId = :userId", { userId })
      .orderBy("thread.lastMessageAt", "DESC")
      .getMany();

    return threads;
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
