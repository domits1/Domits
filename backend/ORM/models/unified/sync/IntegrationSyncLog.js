import { EntitySchema } from "typeorm";

const bigintNumber = {
  type: "bigint",
  transformer: {
    from: (value) => (value === null || value === undefined ? value : Number(value)),
    to: (value) => value,
  },
};

export const IntegrationSyncLog = new EntitySchema({
  name: "IntegrationSyncLog",
  tableName: "integration_sync_log",
  columns: {
    id: { primary: true, type: "varchar", generated: false, nullable: false },
    integrationAccountId: { type: "varchar", nullable: false },
    syncType: { type: "varchar", nullable: false },
    direction: { type: "varchar", nullable: false },
    status: { type: "varchar", nullable: false },
    startedAt: { ...bigintNumber, nullable: false },
    finishedAt: { ...bigintNumber, nullable: true },
    itemsProcessed: { type: "int", nullable: true },
    errorCode: { type: "varchar", nullable: true },
    errorMessage: { type: "text", nullable: true },
    details: { type: "text", nullable: true },
  },
});