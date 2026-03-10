export const CALENDAR_PROVIDER = Object.freeze({
  AIRBNB: "airbnb",
  BOOKING: "booking",
  GENERIC: "generic",
});

export const normalizeCalendarProvider = (provider) => {
  const normalized = String(provider || "").trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized === CALENDAR_PROVIDER.AIRBNB || normalized === CALENDAR_PROVIDER.BOOKING) {
    return normalized;
  }
  return CALENDAR_PROVIDER.GENERIC;
};

export const resolveCalendarProvider = ({ calendarProvider, calendarUrl, calendarName }) => {
  const explicitProvider = normalizeCalendarProvider(calendarProvider);
  if (explicitProvider) {
    return explicitProvider;
  }

  const url = String(calendarUrl || "").trim().toLowerCase();
  const name = String(calendarName || "").trim().toLowerCase();

  let hostname = "";
  if (url) {
    try {
      hostname = String(new URL(url).hostname || "").toLowerCase();
    } catch {
      hostname = "";
    }
  }

  if (hostname.includes("airbnb") || url.includes("airbnb") || name.includes("airbnb")) {
    return CALENDAR_PROVIDER.AIRBNB;
  }

  if (hostname.includes("booking.com") || url.includes("booking.com") || name.includes("booking")) {
    return CALENDAR_PROVIDER.BOOKING;
  }

  return CALENDAR_PROVIDER.GENERIC;
};
