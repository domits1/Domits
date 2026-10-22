import { randomUUID } from "node:crypto";
import Database from "../../integrations/ORM/index.js";
import { withDsqlRetry } from "../../dsqlRetry.js";
import { AUDIT_ACTION, TERMINAL_ACCESS_CREDENTIAL_STATUSES } from "../homeAutomationConstants.js";
import DeviceAuditRepository from "./deviceAuditRepository.js";
import { qualifiedTable, requireId, rowsOf } from "./sqlHelpers.js";

const DEVICE_TABLE = "home_automation_device";
const CREDENTIAL_TABLE = "access_credential";

export const MAPPING_OUTCOME = Object.freeze({
  MAPPED: "MAPPED",
  REMAPPED: "REMAPPED",
  UNCHANGED: "UNCHANGED",
  UNMAPPED: "UNMAPPED",
  NOT_MAPPED: "NOT_MAPPED",
  IN_USE: "IN_USE",
});

const UNIQUE_VIOLATION = "23505";
const isUniqueViolation = (error) => String(error?.code ?? error?.driverError?.code ?? "") === UNIQUE_VIOLATION;

const requireDevice = (device) => {
  const deviceType = requireId(device?.deviceType, "device.deviceType");
  const status = requireId(device?.status, "device.status");
  return {
    deviceType,
    status,
    name: typeof device.name === "string" ? device.name : null,
    batteryLevel: Number.isInteger(device.batteryLevel) ? device.batteryLevel : null,
    lastSeenAt: Number.isInteger(device.lastSeenAt) ? device.lastSeenAt : null,
  };
};

// A row in home_automation_device is a mapping: it exists only while the device is linked to a property, and one
// device maps to one property (unique on the account and provider device id). Every change writes its audit row in
// the same transaction, and Aurora DSQL's optimistic concurrency makes a competing writer fail at commit with
// 40001, which is retried from the read.
export default class DeviceMappingRepository {
  #getClient;
  #audit;
  #now;
  #randomId;
  #retryOptions;

  constructor({
    getClient = () => Database.getInstance(),
    auditRepository = new DeviceAuditRepository({ getClient }),
    now = Date.now,
    randomId = randomUUID,
    retryOptions = {},
  } = {}) {
    this.#getClient = getClient;
    this.#audit = auditRepository;
    this.#now = now;
    this.#randomId = randomId;
    this.#retryOptions = retryOptions;
  }

  async find(integrationAccountId, providerDeviceId) {
    const accountId = requireId(integrationAccountId, "integrationAccountId");
    const deviceId = requireId(providerDeviceId, "providerDeviceId");
    const client = await this.#getClient();
    const rows = rowsOf(
      await client.query(
        `SELECT id, integration_account_id, provider_device_id, property_id
         FROM ${qualifiedTable(client, DEVICE_TABLE)}
         WHERE integration_account_id = $1 AND provider_device_id = $2
         LIMIT 1`,
        [accountId, deviceId]
      )
    );
    return rows.length > 0 ? this.#toMapping(rows[0]) : null;
  }

  // device is the live snapshot from RemoteLock (the mapper's fields), stored when the row is created or moved.
  async saveMapping({ integrationAccountId, userId, providerDeviceId, propertyId, device }) {
    const change = {
      integrationAccountId: requireId(integrationAccountId, "integrationAccountId"),
      userId: requireId(userId, "userId"),
      providerDeviceId: requireId(providerDeviceId, "providerDeviceId"),
      propertyId: requireId(propertyId, "propertyId"),
      device: requireDevice(device),
    };
    return this.#inTransaction((manager) => this.#writeMapping(manager, change));
  }

  async removeMapping({ integrationAccountId, userId, providerDeviceId }) {
    const change = {
      integrationAccountId: requireId(integrationAccountId, "integrationAccountId"),
      userId: requireId(userId, "userId"),
      providerDeviceId: requireId(providerDeviceId, "providerDeviceId"),
    };
    return this.#inTransaction((manager) => this.#deleteMapping(manager, change));
  }

  // deviceId is the id of the home_automation_device row, which access_credential.device_id points to. Any status
  // that is not known to be terminal counts as live, so a status added later blocks an unmap until it is listed.
  async hasLiveCredential(deviceId, executor) {
    const id = requireId(deviceId, "deviceId");
    const runner = executor ?? (await this.#getClient());
    const placeholders = TERMINAL_ACCESS_CREDENTIAL_STATUSES.map((_status, index) => `$${index + 2}`).join(", ");
    const rows = rowsOf(
      await runner.query(
        `SELECT 1 FROM ${qualifiedTable(runner, CREDENTIAL_TABLE)}
         WHERE device_id = $1 AND status NOT IN (${placeholders})
         LIMIT 1`,
        [id, ...TERMINAL_ACCESS_CREDENTIAL_STATUSES]
      )
    );
    return rows.length > 0;
  }

  // A first-time save that loses a race on the unique index fails with 23505. Nothing was written, so the whole
  // transaction runs once more: the read then finds the other writer's row and decides from it.
  async #inTransaction(work) {
    const client = await this.#getClient();
    const attempt = () => withDsqlRetry(() => client.transaction(work), this.#retryOptions);
    try {
      return await attempt();
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      return attempt();
    }
  }

  async #writeMapping(manager, change) {
    const table = qualifiedTable(manager, DEVICE_TABLE);
    const { integrationAccountId, userId, providerDeviceId, propertyId, device } = change;
    const existing = await this.#readRow(manager, integrationAccountId, providerDeviceId);
    const now = this.#now();

    if (!existing) {
      await manager.query(
        `INSERT INTO ${table}
           (id, integration_account_id, provider_device_id, property_id, device_type, name, status, battery_level,
            last_seen_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)`,
        [
          this.#randomId(),
          integrationAccountId,
          providerDeviceId,
          propertyId,
          device.deviceType,
          device.name,
          device.status,
          device.batteryLevel,
          device.lastSeenAt,
          now,
        ]
      );
      await this.#audit.insert(manager, {
        integrationAccountId,
        userId,
        providerDeviceId,
        action: AUDIT_ACTION.MAPPED,
        oldPropertyId: null,
        newPropertyId: propertyId,
      });
      return { outcome: MAPPING_OUTCOME.MAPPED, propertyId };
    }

    if (existing.propertyId === propertyId) return { outcome: MAPPING_OUTCOME.UNCHANGED, propertyId };
    // A live credential belongs to a booking at the current property, so the lock cannot move under it.
    if (await this.hasLiveCredential(existing.id, manager)) return { outcome: MAPPING_OUTCOME.IN_USE };

    await manager.query(
      `UPDATE ${table}
       SET property_id = $2, device_type = $3, name = $4, status = $5, battery_level = $6, last_seen_at = $7,
           updated_at = $8
       WHERE id = $1`,
      [
        existing.id,
        propertyId,
        device.deviceType,
        device.name,
        device.status,
        device.batteryLevel,
        device.lastSeenAt,
        now,
      ]
    );
    await this.#audit.insert(manager, {
      integrationAccountId,
      userId,
      providerDeviceId,
      action: AUDIT_ACTION.REMAPPED,
      oldPropertyId: existing.propertyId,
      newPropertyId: propertyId,
    });
    return { outcome: MAPPING_OUTCOME.REMAPPED, propertyId };
  }

  async #deleteMapping(manager, change) {
    const { integrationAccountId, userId, providerDeviceId } = change;
    const existing = await this.#readRow(manager, integrationAccountId, providerDeviceId);
    if (!existing) return { outcome: MAPPING_OUTCOME.NOT_MAPPED };
    if (await this.hasLiveCredential(existing.id, manager)) return { outcome: MAPPING_OUTCOME.IN_USE };

    await manager.query(`DELETE FROM ${qualifiedTable(manager, DEVICE_TABLE)} WHERE id = $1`, [existing.id]);
    await this.#audit.insert(manager, {
      integrationAccountId,
      userId,
      providerDeviceId,
      action: AUDIT_ACTION.UNMAPPED,
      oldPropertyId: existing.propertyId,
      newPropertyId: null,
    });
    return { outcome: MAPPING_OUTCOME.UNMAPPED, propertyId: existing.propertyId };
  }

  async #readRow(manager, integrationAccountId, providerDeviceId) {
    const rows = rowsOf(
      await manager.query(
        `SELECT id, integration_account_id, provider_device_id, property_id
         FROM ${qualifiedTable(manager, DEVICE_TABLE)}
         WHERE integration_account_id = $1 AND provider_device_id = $2
         LIMIT 1`,
        [integrationAccountId, providerDeviceId]
      )
    );
    return rows.length > 0 ? this.#toMapping(rows[0]) : null;
  }

  #toMapping(row) {
    return {
      id: row.id,
      integrationAccountId: row.integration_account_id,
      providerDeviceId: row.provider_device_id,
      propertyId: row.property_id,
    };
  }
}
