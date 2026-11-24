export const AUTOMATION_TRIGGER = "BOOKING_PAID";
export const AUTOMATION_TRIGGERS = Object.freeze({
  BOOKING_PAID: "BOOKING_PAID",
  CHECK_IN: "CHECK_IN",
  CHECK_OUT: "CHECK_OUT",
});
export const STAY_SEND_GRACE_MS = 6 * 60 * 60 * 1000;
export const STAY_TIME_ZONE = "Europe/Amsterdam";
export const DEFAULT_CHECK_IN_TIME = "15:00";
export const DEFAULT_CHECK_OUT_TIME = "11:00";
export const AUTOMATION_CHANNEL = "DOMITS_DIRECT";
export const AUTOMATION_STATUSES = new Set(["DRAFT", "ACTIVE", "PAUSED"]);
export const OFFSET_UNITS = new Set(["MINUTES", "HOURS", "DAYS"]);
export const DELIVERY_STATUSES = new Set(["SCHEDULED", "PROCESSING", "SENT", "FAILED", "CANCELLED"]);
export const OUTBOX_EVENT_VERSION = 1;
export const BOOKING_DATES_CHANGED_EVENT = "BOOKING_DATES_CHANGED";
export const APPROVED_VARIABLES = Object.freeze([
  "guestName",
  "propertyName",
  "checkInDate",
  "checkOutDate",
  "checkInTime",
  "checkOutTime",
  "propertyAddress",
  "propertyCity",
  "numberOfGuests",
]);

export const SAFE_PREVIEW_VALUES = Object.freeze({
  guestName: "Taylor",
  propertyName: "Canal Loft",
  checkInDate: "20 Jun 2026",
  checkOutDate: "23 Jun 2026",
  checkInTime: "15:00",
  checkOutTime: "11:00",
  propertyAddress: "Keizersgracht 12, 1015 CJ",
  propertyCity: "Amsterdam",
  numberOfGuests: "2",
});
