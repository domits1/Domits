const text = (value) => (typeof value === "string" && value.trim() ? value.trim() : null);
const integer = (value) => (Number.isInteger(value) ? value : null);

// Every mapper below builds its result from named fields. Never spread the raw object: a RemoteLock access
// guest carries the generated pin in its attributes, and it must not leave this file.

// A number, or a numeric string such as "82", kept within 0 and 100; anything else is unknown.
const percent = (value) => {
  const number = typeof value === "string" && value.trim() ? Number(value) : value;
  return Number.isFinite(number) ? Math.min(100, Math.max(0, Math.round(number))) : null;
};

const connectionStatus = (connected) => {
  if (connected === true) return "ONLINE";
  return connected === false ? "OFFLINE" : "UNKNOWN";
};

const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T/;
// RemoteLock's docs show 2000-01-01 as a connected_at, which is a placeholder and not a last-seen time.
const EARLIEST_PLAUSIBLE_MS = Date.UTC(2010, 0, 1);
const epochMs = (value) => {
  const ms = typeof value === "string" && ISO_DATE_TIME.test(value) ? Date.parse(value) : Number.NaN;
  return Number.isFinite(ms) && ms >= EARLIEST_PLAUSIBLE_MS ? ms : null;
};

// RemoteLock resort_lock devices use a different guest flow (/resort_lock_guests), which is out of scope.
// power_level, connected and connected_at are in the documented "Get all devices" example; what they mean for each
// device model (and connected_at as a last-seen time) is unconfirmed until tested against the sandbox.
export const mapDevice = (raw) => {
  const providerDeviceId = text(raw?.id);
  const deviceType = text(raw?.type);
  if (!providerDeviceId || !deviceType) return null;
  const attributes = raw.attributes;
  return {
    providerDeviceId,
    deviceType,
    name: text(attributes?.name),
    status: connectionStatus(attributes?.connected),
    batteryLevel: percent(attributes?.power_level),
    lastSeenAt: epochMs(attributes?.connected_at),
  };
};

export const mapDevicePage = (raw) => {
  if (!Array.isArray(raw?.data)) return null;
  const devices = raw.data.map(mapDevice);
  if (devices.includes(null)) return null;
  const meta = raw.meta ?? {};
  return {
    devices,
    page: integer(meta.page),
    perPage: integer(meta.per_page),
    totalPages: integer(meta.total_pages),
    totalCount: integer(meta.total_count),
  };
};

// startsAt and endsAt stay lock-local strings, exactly as RemoteLock returns them.
export const mapAccessGuest = (raw) => {
  const providerCredentialId = text(raw?.id);
  if (!providerCredentialId) return null;
  return {
    providerCredentialId,
    status: text(raw.attributes?.status),
    startsAt: text(raw.attributes?.starts_at),
    endsAt: text(raw.attributes?.ends_at),
  };
};

export const mapAccess = (raw) => {
  const providerAccessId = text(raw?.id);
  return providerAccessId ? { providerAccessId } : null;
};

export const buildGuestName = (bookingId) => {
  const id = text(bookingId);
  if (!id) throw new Error("A booking id is required to name the RemoteLock guest.");
  return `Domits booking ${id}`;
};
