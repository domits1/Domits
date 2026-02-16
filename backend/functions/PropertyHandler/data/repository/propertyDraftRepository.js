import Database from "database";
import { Property_Draft } from "database/models/Property_Draft";
import { randomUUID } from "node:crypto";

export class PropertyDraftRepository {
  constructor(systemManager) {
    this.systemManager = systemManager;
  }

  async createDraft(hostId) {
    const client = await Database.getInstance();
    const propertyId = randomUUID();
    const now = Date.now();
    await client
      .createQueryBuilder()
      .insert()
      .into(Property_Draft)
      .values({
        property_id: propertyId,
        host_id: hostId,
        created_at: now,
        last_activity_at: now,
      })
      .execute();
    return propertyId;
  }

  async getDraftById(propertyId) {
    const client = await Database.getInstance();
    return client
      .getRepository(Property_Draft)
      .createQueryBuilder("property_draft")
      .where("property_id = :propertyId", { propertyId })
      .getOne();
  }

  async touchDraft(propertyId) {
    const client = await Database.getInstance();
    await client
      .createQueryBuilder()
      .update(Property_Draft)
      .set({ last_activity_at: Date.now() })
      .where("property_id = :propertyId", { propertyId })
      .execute();
  }

  async deleteDraft(propertyId) {
    const client = await Database.getInstance();
    await client
      .createQueryBuilder()
      .delete()
      .from(Property_Draft)
      .where("property_id = :propertyId", { propertyId })
      .execute();
  }
}
