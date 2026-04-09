import { EntitySchema } from "typeorm";

const bigintNumber = {
  type: "bigint",
  transformer: {
    from: (value) => (value === null || value === undefined ? value : Number(value)),
    to: (value) => value,
  },
};

export const IntegrationSyncState = new EntitySchema({
  name: "IntegrationSyncState",
  tableName: "integration_sync_state",
  columns: {
    id: { primary: true, type: "varchar", generated: false, nullable: false },
    integrationAccountId: { type: "varchar", nullable: false },
    syncType: { type: "varchar", nullable: false },
    lastCursor: { type: "varchar", nullable: true },
    lastSyncedAt: { ...bigintNumber, nullable: true },
    lastSuccessfulItemAt: { ...bigintNumber, nullable: true },
    status: { type: "varchar", nullable: false },
    createdAt: { ...bigintNumber, nullable: false },
    updatedAt: { ...bigintNumber, nullable: false },
  },
});