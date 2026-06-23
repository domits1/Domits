import { randomUUID } from "node:crypto";
import Database from "../.shared/integrations/ORM/index.js";
import { MessageAutomation } from "database/models/automation/MessageAutomation";

export default class AutomationRepository {
  async listByHost(hostId) {
    const client = await Database.getInstance();
    return client
      .getRepository(MessageAutomation)
      .createQueryBuilder("automation")
      .where("automation.hostId = :hostId", { hostId })
      .orderBy("automation.updatedAt", "DESC")
      .getMany();
  }

  async getByIdForHost(id, hostId) {
    const client = await Database.getInstance();
    return client.getRepository(MessageAutomation).findOne({ where: { id, hostId } });
  }

  async getById(id) {
    const client = await Database.getInstance();
    return client.getRepository(MessageAutomation).findOne({ where: { id } });
  }

  async create(data) {
    const client = await Database.getInstance();
    const now = Date.now();
    const automation = { id: randomUUID(), ...data, createdAt: now, updatedAt: now };
    await client.createQueryBuilder().insert().into(MessageAutomation).values(automation).execute();
    return automation;
  }

  async update(id, hostId, patch) {
    const client = await Database.getInstance();
    await client
      .createQueryBuilder()
      .update(MessageAutomation)
      .set({ ...patch, updatedAt: Date.now() })
      .where("id = :id", { id })
      .andWhere("hostId = :hostId", { hostId })
      .execute();
    return this.getByIdForHost(id, hostId);
  }

  async listActiveForBooking(hostId, propertyId) {
    const client = await Database.getInstance();
    return client
      .getRepository(MessageAutomation)
      .createQueryBuilder("automation")
      .where("automation.hostId = :hostId", { hostId })
      .andWhere("automation.status = :status", { status: "ACTIVE" })
      .andWhere("automation.triggerType = :triggerType", { triggerType: "BOOKING_PAID" })
      .andWhere("(automation.propertyId IS NULL OR automation.propertyId = :propertyId)", { propertyId })
      .getMany();
  }
}
