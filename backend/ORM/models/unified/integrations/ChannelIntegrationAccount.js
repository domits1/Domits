import { EntitySchema } from "typeorm";

const bigintNumber = {
  type: "bigint",
  transformer: {
    from: (value) => (value === null || value === undefined ? value : Number(value)),
    to: (value) => value,
  },
};

export const ChannelIntegrationAccount = new EntitySchema({
  name: "ChannelIntegrationAccount",
  tableName: "channel_integration_account",
  columns: {
    id: { primary: true, type: "varchar", generated: false, nullable: false },
    userId: { type: "varchar", nullable: false },
    channel: { type: "varchar", nullable: false },
    externalAccountId: { type: "varchar", nullable: true },
    displayName: { type: "varchar", nullable: true },
    status: { type: "varchar", nullable: false },
    credentialsRef: { type: "varchar", nullable: true },
    lastSuccessfulSyncAt: { ...bigintNumber, nullable: true },
    lastFailedSyncAt: { ...bigintNumber, nullable: true },
    lastErrorCode: { type: "varchar", nullable: true },
    lastErrorMessage: { type: "text", nullable: true },
    createdAt: { ...bigintNumber, nullable: false },
    updatedAt: { ...bigintNumber, nullable: false },
  },
});