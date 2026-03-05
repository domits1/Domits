import { EntitySchema } from "typeorm";

const bigintNumber = {
  type: "bigint",
  transformer: {
    from: (value) => (value === null || value === undefined ? value : Number(value)),
    to: (value) => value,
  },
};

export const UnifiedThread = new EntitySchema({
  name: "UnifiedThread",
  tableName: "unified_thread",
  columns: {
    id: {
      primary: true,
      type: "varchar",
      generated: false,
      nullable: false,
    },
    hostId: {
      type: "varchar",
      nullable: false,
    },
    guestId: {
      type: "varchar",
      nullable: false,
    },
    propertyId: {
      type: "varchar",
      nullable: true,
    },
    platform: {
      type: "varchar",
      nullable: false,
    },
    externalThreadId: {
      type: "varchar",
      nullable: true,
    },
    status: {
      type: "varchar",
      default: "OPEN",
      nullable: false,
    },
    createdAt: {
      ...bigintNumber,
      nullable: false,
    },
    updatedAt: {
      ...bigintNumber,
      nullable: false,
    },
    lastMessageAt: {
      ...bigintNumber,
      nullable: true,
    },

    integrationAccountId: {
      name: "integrationaccountid",
      type: "varchar",
      nullable: true,
    },
    assignedToUserId: {
      name: "assignedtouserid",
      type: "varchar",
      nullable: true,
    },
    priority: {
      name: "priority",
      type: "varchar",
      nullable: true,
    },
    lastInboundAt: {
      name: "lastinboundat",
      ...bigintNumber,
      nullable: true,
    },
    lastOutboundAt: {
      name: "lastoutboundat",
      ...bigintNumber,
      nullable: true,
    },
  },
});