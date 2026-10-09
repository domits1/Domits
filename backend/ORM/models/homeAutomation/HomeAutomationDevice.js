import { EntitySchema } from "typeorm";

const bigintNumber = {
  type: "bigint",
  transformer: {
    from: (value) => (value === null || value === undefined ? value : Number(value)),
    to: (value) => value,
  },
};

// One smart-lock (or other device) as the provider reports it, belonging to a property of the host.
// capabilities is a JSON string in a text column, like rawPayload on ChannelReservationLink.
export const HomeAutomationDevice = new EntitySchema({
  name: "HomeAutomationDevice",
  tableName: "home_automation_device",
  columns: {
    id: { primary: true, type: "varchar", generated: false, nullable: false },
    integrationAccountId: { name: "integration_account_id", type: "varchar", nullable: false },
    providerDeviceId: { name: "provider_device_id", type: "varchar", nullable: false },
    propertyId: { name: "property_id", type: "varchar", nullable: false },
    unitId: { name: "unit_id", type: "varchar", nullable: true },
    deviceType: { name: "device_type", type: "varchar", nullable: false },
    name: { type: "varchar", nullable: true },
    capabilities: { type: "text", nullable: true },
    status: { type: "varchar", nullable: false },
    batteryLevel: { name: "battery_level", type: "int", nullable: true },
    lastSeenAt: { name: "last_seen_at", ...bigintNumber, nullable: true },
    createdAt: { name: "created_at", ...bigintNumber, nullable: false },
    updatedAt: { name: "updated_at", ...bigintNumber, nullable: false },
  },
});
