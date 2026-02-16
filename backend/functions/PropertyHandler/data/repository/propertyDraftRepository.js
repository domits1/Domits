import Database from "database";
import { randomUUID } from "node:crypto";

export class PropertyDraftRepository {
  constructor(systemManager) {
    this.systemManager = systemManager;
  }

  async createDraft(hostId) {
    const client = await Database.getInstance();
    const propertyId = randomUUID();
    const now = Date.now();
    await client.query(
      `INSERT INTO property_draft (property_id, host_id, created_at, last_activity_at)
       VALUES ($1, $2, $3, $4)`,
      [propertyId, hostId, now, now]
    );
    return propertyId;
  }

  async getDraftById(propertyId) {
    const client = await Database.getInstance();
    const rows = await client.query(
      `SELECT property_id, host_id, created_at, last_activity_at
       FROM property_draft
       WHERE property_id = $1
       LIMIT 1`,
      [propertyId]
    );
    return rows[0] || null;
  }

  async touchDraft(propertyId) {
    const client = await Database.getInstance();
    await client.query(
      `UPDATE property_draft
       SET last_activity_at = $2
       WHERE property_id = $1`,
      [propertyId, Date.now()]
    );
  }

  async deleteDraft(propertyId) {
    const client = await Database.getInstance();
    await client.query(
      `DELETE FROM property_draft
       WHERE property_id = $1`,
      [propertyId]
    );
  }
}
