import { EntitySchema } from "typeorm";

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
      type: "bigint",
      transformer: {
        from: (value) => Number(value),
        to: (value) => value,
      },
      nullable: false,
    },
    updatedAt: {
      type: "bigint",
      transformer: {
        from: (value) => Number(value),
        to: (value) => value,
      },
      nullable: false,
    },
    lastMessageAt: {
      type: "bigint",
      transformer: {
        from: (value) => Number(value),
        to: (value) => value,
      },
      nullable: true,
    },
  },
});
