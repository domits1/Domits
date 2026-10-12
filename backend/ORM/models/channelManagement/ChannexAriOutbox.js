import { EntitySchema } from "typeorm";

const bigintNumber = {
  type: "bigint",
  transformer: {
    from: (value) => (value === null || value === undefined ? value : Number(value)),
    to: (value) => value,
  },
};

// One row per ARI change: "this property changed, these dates, these types".
// Written in the same transaction as the domain change, drained by the worker in
// ChannelManagement. Column names are lowercase without separators, as in
// BookingAutomationOutbox, because that is what the migration creates.
export const ChannexAriOutbox = new EntitySchema({
  name: "ChannexAriOutbox",
  tableName: "channex_ari_outbox",
  columns: {
    id: { primary: true, type: "varchar", generated: false, nullable: false },
    domitsPropertyId: { name: "domitspropertyid", type: "varchar", nullable: false },
    kind: { type: "varchar", nullable: false },
    changeTypes: { name: "changetypes", type: "varchar", nullable: false },
    dateFrom: { name: "datefrom", type: "int", nullable: false },
    dateTo: { name: "dateto", type: "int", nullable: false },
    source: { type: "varchar", nullable: false },
    status: { type: "varchar", nullable: false, default: "PENDING" },
    attemptCount: { name: "attemptcount", type: "int", nullable: false, default: 0 },
    nextAttemptAt: { name: "nextattemptat", ...bigintNumber, nullable: true },
    failureReason: { name: "failurereason", type: "text", nullable: true },
    sentSummary: { name: "sentsummary", type: "text", nullable: true },
    createdAt: { name: "createdat", ...bigintNumber, nullable: false },
    updatedAt: { name: "updatedat", ...bigintNumber, nullable: false },
    processedAt: { name: "processedat", ...bigintNumber, nullable: true },
  },
});
