import { EntitySchema } from "typeorm";

const bigintNumber = {
  type: "bigint",
  transformer: {
    from: (value) => (value === null || value === undefined ? value : Number(value)),
    to: (value) => value,
  },
};

export const Property_Moderation_Event = new EntitySchema({
  name: "Property_Moderation_Event",
  tableName: "property_moderation_event",
  columns: {
    id: { primary: true, type: "varchar", length: 255, generated: false, nullable: false },
    propertyId: { name: "property_id", type: "varchar", length: 255, nullable: false },
    action: { type: "varchar", length: 20, nullable: false },
    actorId: { name: "actor_id", type: "varchar", length: 255, nullable: false },
    reason: { type: "text", nullable: true },
    fromStatus: { name: "from_status", type: "varchar", length: 50, nullable: false },
    toStatus: { name: "to_status", type: "varchar", length: 50, nullable: false },
    createdAt: { name: "created_at", ...bigintNumber, nullable: false },
  },
});
