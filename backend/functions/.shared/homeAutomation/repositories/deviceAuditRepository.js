import { randomUUID } from "node:crypto";
import Database from "../../integrations/ORM/index.js";
import { AUDIT_ACTION } from "../homeAutomationConstants.js";
import { qualifiedTable, requireId, rowsOf } from "./sqlHelpers.js";

const TABLE = "home_automation_device_audit";
export const MAX_AUDIT_PAGE = 200;
const DEFAULT_AUDIT_PAGE = 50;

// Which property ids each action carries. A row that breaks its shape would misreport what changed.
const SHAPE = Object.freeze({
  [AUDIT_ACTION.MAPPED]: { hasOld: false, hasNew: true },
  [AUDIT_ACTION.REMAPPED]: { hasOld: true, hasNew: true },
  [AUDIT_ACTION.UNMAPPED]: { hasOld: true, hasNew: false },
});

const optionalId = (value, label, expected) => {
  if (!expected) {
    if (value !== null && value !== undefined) throw new Error(`${label} must be empty for this action.`);
    return null;
  }
  return requireId(value, label);
};

// Append-only: the public surface is insert and listByAccount, and a test pins it. A mapping change writes its row
// inside the same transaction as the change itself, so insert takes that transaction's manager. Ids only, never a
// device name or a token.
export default class DeviceAuditRepository {
  #getClient;
  #now;
  #randomId;

  constructor({ getClient = () => Database.getInstance(), now = Date.now, randomId = randomUUID } = {}) {
    this.#getClient = getClient;
    this.#now = now;
    this.#randomId = randomId;
  }

  async insert(manager, row) {
    if (typeof manager?.query !== "function") throw new Error("A transaction manager is required.");
    if (!Object.hasOwn(SHAPE, row?.action)) throw new Error("action must be MAPPED, REMAPPED or UNMAPPED.");

    const shape = SHAPE[row.action];
    const entry = {
      id: this.#randomId(),
      integrationAccountId: requireId(row.integrationAccountId, "integrationAccountId"),
      userId: requireId(row.userId, "userId"),
      providerDeviceId: requireId(row.providerDeviceId, "providerDeviceId"),
      action: row.action,
      oldPropertyId: optionalId(row.oldPropertyId, "oldPropertyId", shape.hasOld),
      newPropertyId: optionalId(row.newPropertyId, "newPropertyId", shape.hasNew),
      createdAt: this.#now(),
    };
    if (row.action === AUDIT_ACTION.REMAPPED && entry.oldPropertyId === entry.newPropertyId) {
      throw new Error("A remap must change the property.");
    }

    await manager.query(
      `INSERT INTO ${qualifiedTable(manager, TABLE)}
         (id, integration_account_id, user_id, provider_device_id, action, old_property_id, new_property_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        entry.id,
        entry.integrationAccountId,
        entry.userId,
        entry.providerDeviceId,
        entry.action,
        entry.oldPropertyId,
        entry.newPropertyId,
        entry.createdAt,
      ]
    );
    return entry;
  }

  // Newest first, which is what the (integration_account_id, created_at) index serves.
  async listByAccount(integrationAccountId, { limit = DEFAULT_AUDIT_PAGE } = {}) {
    const accountId = requireId(integrationAccountId, "integrationAccountId");
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_AUDIT_PAGE) {
      throw new Error(`limit must be an integer between 1 and ${MAX_AUDIT_PAGE}.`);
    }

    const client = await this.#getClient();
    const rows = rowsOf(
      await client.query(
        `SELECT id, integration_account_id, user_id, provider_device_id, action, old_property_id, new_property_id,
                created_at
         FROM ${qualifiedTable(client, TABLE)}
         WHERE integration_account_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [accountId, limit]
      )
    );
    return rows.map((row) => ({
      id: row.id,
      integrationAccountId: row.integration_account_id,
      userId: row.user_id,
      providerDeviceId: row.provider_device_id,
      action: row.action,
      oldPropertyId: row.old_property_id,
      newPropertyId: row.new_property_id,
      createdAt: Number(row.created_at),
    }));
  }
}
