import { EntitySchema } from "typeorm";

const bigintNumber = {
  type: "bigint",
  transformer: {
    from: (value) => (value === null || value === undefined ? value : Number(value)),
    to: (value) => value,
  },
};

// Append-only: the repository only inserts. action is MAPPED, REMAPPED or UNMAPPED, checked in code (DSQL has no CHECK).
export const HomeAutomationDeviceAudit = new EntitySchema({
  name: "HomeAutomationDeviceAudit",
  tableName: "home_automation_device_audit",
  columns: {
    id: { primary: true, type: "varchar", length: 255, generated: false, nullable: false },
    integrationAccountId: { name: "integration_account_id", type: "varchar", length: 255, nullable: false },
    userId: { name: "user_id", type: "varchar", length: 255, nullable: false },
    providerDeviceId: { name: "provider_device_id", type: "varchar", length: 255, nullable: false },
    action: { type: "varchar", length: 20, nullable: false },
    oldPropertyId: { name: "old_property_id", type: "varchar", length: 255, nullable: true },
    newPropertyId: { name: "new_property_id", type: "varchar", length: 255, nullable: true },
    createdAt: { name: "created_at", ...bigintNumber, nullable: false },
  },
});
