import { EntitySchema } from "typeorm";

/**
 * RoomPriceGenie_Integration
 *
 * One record per Domits property connected to RoomPriceGenie.
 * A host can have multiple properties, each with their own RPG account.
 *
 * Authentication model (from RPG API docs):
 * - Global partner API key stored in AWS SSM Parameter Store (one for all of Domits)
 * - Per-property: client_id (non-sensitive) + client_secret (in Secrets Manager)
 * - JWT access tokens (24h validity) + refresh tokens (7 days) stored in Secrets Manager
 */
export const RoomPriceGenie_Integration = new EntitySchema({
  name: "RoomPriceGenie_Integration",
  tableName: "roompricegenie_integration",
  columns: {
    id: {
      primary: true,
      type: "varchar",
      generated: "uuid",
      nullable: false,
    },
    host_id: {
      type: "varchar",
      nullable: false,
    },
    domits_property_id: {
      type: "varchar",
      nullable: false,
    },
    // RPG's internal property identifier (provided by RPG during onboarding)
    rpg_property_code: {
      type: "varchar",
      nullable: true,
    },
    // RPG per-property client_id (not sensitive, can be stored in DB)
    client_id: {
      type: "varchar",
      nullable: true,
    },
    // Reference to AWS Secrets Manager for client_secret
    client_secret_ref: {
      type: "varchar",
      nullable: true,
    },
    // Reference to AWS Secrets Manager for current access_token + refresh_token
    token_secret_ref: {
      type: "varchar",
      nullable: true,
    },
    // When the current access_token expires (ms timestamp)
    token_expires_at: {
      type: "bigint",
      nullable: true,
    },
    is_active: {
      type: "boolean",
      nullable: false,
      default: false,
    },
    // "auto" = RPG pushes to our webhook, "manual" = host triggers sync
    sync_mode: {
      type: "varchar",
      nullable: false,
      default: "manual",
    },
    // Optional price boundaries set by the host
    min_price: {
      type: "int",
      nullable: true,
    },
    max_price: {
      type: "int",
      nullable: true,
    },
    created_at: {
      type: "bigint",
      nullable: false,
    },
    last_sync_at: {
      type: "bigint",
      nullable: true,
    },
    // "success" | "error" | "no_data" | "connected" | "disconnected"
    last_sync_status: {
      type: "varchar",
      nullable: true,
    },
    last_sync_error: {
      type: "varchar",
      nullable: true,
    },
  },
});
