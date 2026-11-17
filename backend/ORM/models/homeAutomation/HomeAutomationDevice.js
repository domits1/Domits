import { EntitySchema } from "typeorm";

const bigintNumber = {
  type: "bigint",
  transformer: {
    from: (value) => (value === null || value === undefined ? value : Number(value)),
    to: (value) => value,
  },
};

// capabilities is a JSON string in a text column, like rawPayload on ChannelReservationLink.
export const HomeAutomationDevice = new EntitySchema({
  name: "HomeAutomationDevice",
  tableName: "home_automation_device",
  columns: {
    id: { primary: true, type: "varchar", length: 255, generated: false, nullable: false },
    integrationAccountId: { name: "integration_account_id", type: "varchar", length: 255, nullable: false },
    providerDeviceId: { name: "provider_device_id", type: "varchar", length: 255, nullable: false },
    propertyId: { name: "property_id", type: "varchar", length: 255, nullable: false },
    unitId: { name: "unit_id", type: "varchar", length: 255, nullable: true },
    deviceType: { name: "device_type", type: "varchar", length: 50, nullable: false },
    name: { type: "varchar", length: 255, nullable: true },
    capabilities: { type: "text", nullable: true },
    status: { type: "varchar", length: 50, nullable: false },
    batteryLevel: { name: "battery_level", type: "int", nullable: true },
    lastSeenAt: { name: "last_seen_at", ...bigintNumber, nullable: true },
    createdAt: { name: "created_at", ...bigintNumber, nullable: false },
    updatedAt: { name: "updated_at", ...bigintNumber, nullable: false },
  },
});
