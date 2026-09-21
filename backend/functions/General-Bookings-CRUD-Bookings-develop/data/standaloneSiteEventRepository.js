import Database from "database";
import { randomUUID } from "node:crypto";
import { qualifyTableName } from "./propertyRepository.js";

class StandaloneSiteEventRepository {
  async recordEvent({ propertyId = null, hostId, eventType, payload = null, occurredAt = Date.now() }) {
    const client = await Database.getInstance();
    await client.query(
      `
        INSERT INTO ${qualifyTableName(client, "standalone_site_event")}
          (id, draft_id, property_id, host_id, event_type, payload_json, occurred_at)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7)
      `,
      [randomUUID(), null, propertyId, hostId, eventType, payload ? JSON.stringify(payload) : null, occurredAt]
    );
  }
}

export default StandaloneSiteEventRepository;
