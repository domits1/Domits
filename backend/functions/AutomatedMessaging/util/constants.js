export const AUTOMATION_TRIGGER = "BOOKING_PAID";
export const AUTOMATION_CHANNEL = "DOMITS_DIRECT";
export const AUTOMATION_STATUSES = new Set(["DRAFT", "ACTIVE", "PAUSED"]);
export const OFFSET_UNITS = new Set(["MINUTES", "HOURS", "DAYS"]);
export const DELIVERY_STATUSES = new Set(["SCHEDULED", "PROCESSING", "SENT", "FAILED", "CANCELLED"]);
export const OUTBOX_EVENT_VERSION = 1;
export const APPROVED_VARIABLES = Object.freeze([
  "guestName",
  "propertyName",
  "checkInDate",
  "checkOutDate",
]);

export const SAFE_PREVIEW_VALUES = Object.freeze({
  guestName: "Taylor",
  propertyName: "Canal Loft",
  checkInDate: "20 Jun 2026",
  checkOutDate: "23 Jun 2026",
});
