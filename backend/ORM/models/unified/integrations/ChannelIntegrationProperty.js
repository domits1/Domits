import { EntitySchema } from "typeorm";

const bigintNumber = {
  type: "bigint",
  transformer: {
    from: (value) => (value === null || value === undefined ? value : Number(value)),
    to: (value) => value,
  },
};

export const ChannelIntegrationProperty = new EntitySchema({
  name: "ChannelIntegrationProperty",
  tableName: "channel_integration_property",
  columns: {
    id: { primary: true, type: "varchar", generated: false, nullable: false },
    integrationAccountId: { type: "varchar", nullable: false },
    domitsPropertyId: { type: "varchar", nullable: false },
    // Nullable since the claim (design note D2, #506): a PROVISIONING row exists before Channex creates the property.
    externalPropertyId: { type: "varchar", nullable: true },
    externalPropertyName: { type: "varchar", nullable: true },
    status: { type: "varchar", nullable: false },
    createdAt: { ...bigintNumber, nullable: false },
    updatedAt: { ...bigintNumber, nullable: false },
  },
});