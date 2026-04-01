import { randomUUID } from "node:crypto";

import Database from "../ORM/index.js";
import { MessagingSchedulerExecutionLog } from "../models/unified/preferences/MessagingSchedulerExecutionLog.js";

export default class MessagingSchedulerExecutionLogRepository {
  async create(payload) {
    const client = await Database.getInstance();
    const row = {
      id: randomUUID(),
      createdAt: Date.now(),
      ...payload,
    };
    await client.createQueryBuilder().insert().into(MessagingSchedulerExecutionLog).values(row).execute();
    return row;
  }

  async findByUniqueKey(uniqueKey) {
    const client = await Database.getInstance();
    return client.getRepository(MessagingSchedulerExecutionLog).findOne({ where: { uniqueKey } });
  }

  async listRecentByThreadAndType(threadId, executionType, sinceMs) {
    const client = await Database.getInstance();
    return client
      .getRepository(MessagingSchedulerExecutionLog)
      .createQueryBuilder("log")
      .where("log.threadId = :threadId", { threadId })
      .andWhere("log.executionType = :executionType", { executionType })
      .andWhere("log.createdAt >= :sinceMs", { sinceMs })
      .orderBy("log.createdAt", "DESC")
      .getMany();
  }
}
