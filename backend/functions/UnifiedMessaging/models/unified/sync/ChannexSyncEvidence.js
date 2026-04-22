import { EntitySchema } from "typeorm";

const bigintNumber = {
  type: "bigint",
  transformer: {
    from: (value) => (value === null || value === undefined ? value : Number(value)),
    to: (value) => value,
  },
};

export const ChannexSyncEvidence = new EntitySchema({
  name: "ChannexSyncEvidence",
  tableName: "channex_sync_evidence",
  columns: {
    id: { primary: true, type: "varchar", generated: false, nullable: false },
    channel: { type: "varchar", nullable: false },
    provider: { type: "varchar", nullable: false },
    integrationAccountId: { type: "varchar", nullable: true },
    domitsPropertyId: { type: "varchar", nullable: true },
    syncType: { type: "varchar", nullable: false },
    dateFrom: { type: "varchar", nullable: true },
    dateTo: { type: "varchar", nullable: true },
    startedAt: { ...bigintNumber, nullable: false },
    finishedAt: { ...bigintNumber, nullable: true },
    status: { type: "varchar", nullable: false },
    overallSuccess: { type: "boolean", nullable: false, default: false },
    mappingSnapshot: { type: "text", nullable: true },
    groupedOutboundPayloadSnapshot: { type: "text", nullable: true },
    providerResponseSummary: { type: "text", nullable: true },
    taskIds: { type: "text", nullable: true },
    warnings: { type: "text", nullable: true },
    errors: { type: "text", nullable: true },
    notes: { type: "text", nullable: true },
    rawDetails: { type: "text", nullable: true },
    createdAt: { ...bigintNumber, nullable: false },
    updatedAt: { ...bigintNumber, nullable: false },
  },
});
