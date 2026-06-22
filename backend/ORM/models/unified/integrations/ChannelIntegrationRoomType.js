import { EntitySchema } from "typeorm";

const bigintNumber = {
  type: "bigint",
  transformer: {
    from: (value) => (value === null || value === undefined ? value : Number(value)),
    to: (value) => value,
  },
};

export const ChannelIntegrationRoomType = new EntitySchema({
  name: "ChannelIntegrationRoomType",
  tableName: "channel_integration_room_type",
  columns: {
    id: { primary: true, type: "varchar", generated: false, nullable: false },
    integrationAccountId: { type: "varchar", nullable: false },
    domitsPropertyId: { type: "varchar", nullable: false },
    externalPropertyId: { type: "varchar", nullable: false },
    externalRoomTypeId: { type: "varchar", nullable: false },
    externalRoomTypeName: { type: "varchar", nullable: true },
    status: { type: "varchar", nullable: false },
    createdAt: { ...bigintNumber, nullable: false },
    updatedAt: { ...bigintNumber, nullable: false },
  },
});
