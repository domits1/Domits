import Database from "database";
import { randomUUID } from "node:crypto";

const resolveSchema = (client) => {
  const configuredSchema = client?.options?.schema;
  if (
    typeof configuredSchema === "string" &&
    /^[A-Za-z_]\w*$/.test(configuredSchema)
  ) {
    return configuredSchema;
  }
  return "public";
};

const draftTable = (schema) => `${schema}.property_draft`;

export class PropertyDraftRepository {
  constructor(systemManager) {
    this.systemManager = systemManager;
  }

  async createDraft(hostId) {
    const client = await Database.getInstance();
    const table = draftTable(resolveSchema(client));
    const propertyId = randomUUID();
    const now = Date.now();
    await client.query(
      `INSERT INTO ${table} (property_id, host_id, created_at, last_activity_at)
       VALUES ($1, $2, $3, $4)`,
      [propertyId, hostId, now, now]
    );
    return propertyId;
  }

  async getDraftById(propertyId) {
    const client = await Database.getInstance();
    const table = draftTable(resolveSchema(client));
    const rows = await client.query(
      `SELECT property_id, host_id, created_at, last_activity_at
       FROM ${table}
       WHERE property_id = $1
       LIMIT 1`,
      [propertyId]
    );
    return rows[0] || null;
  }

  async touchDraft(propertyId) {
    const client = await Database.getInstance();
    const table = draftTable(resolveSchema(client));
    await client.query(
      `UPDATE ${table}
       SET last_activity_at = $2
       WHERE property_id = $1`,
      [propertyId, Date.now()]
    );
  }

  async deleteDraft(propertyId) {
    const client = await Database.getInstance();
    const table = draftTable(resolveSchema(client));
    await client.query(
      `DELETE FROM ${table}
       WHERE property_id = $1`,
      [propertyId]
    );
  }
}
