const text = (value) => (typeof value === "string" && value.trim() ? value.trim() : null);
const integer = (value) => (Number.isInteger(value) ? value : null);

// Every mapper below builds its result from named fields. Never spread the raw object: a RemoteLock access
// guest carries the generated pin in its attributes, and it must not leave this file.

// RemoteLock resort_lock devices use a different guest flow (/resort_lock_guests), which is out of scope.
export const mapDevice = (raw) => {
  const providerDeviceId = text(raw?.id);
  const deviceType = text(raw?.type);
  if (!providerDeviceId || !deviceType) return null;
  return { providerDeviceId, deviceType, name: text(raw.attributes?.name) };
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
