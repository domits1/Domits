const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const padDatePart = (value) => String(value).padStart(2, "0");

export const EMPTY_STAY_RANGE = Object.freeze({ checkIn: null, checkOut: null });

// Calendar keys are local dates ("YYYY-MM-DD"), matching the availability calendar's
// own keys. ISO keys compare lexicographically, so string comparison is date order.
export const toLocalDateKey = (date) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

export const getTodayDateKey = (now = new Date()) => toLocalDateKey(now);

export const isValidDateKey = (value) => typeof value === "string" && DATE_KEY_PATTERN.test(value);

const parseLocalDate = (dateKey) => {
  const match = DATE_KEY_PATTERN.exec(String(dateKey || ""));
  if (!match) {
    return null;
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

export const buildStayNightKeys = (checkIn, checkOut) => {
  if (!isValidDateKey(checkIn) || !isValidDateKey(checkOut) || checkOut <= checkIn) {
    return [];
  }

  const nightKeys = [];
  const cursor = parseLocalDate(checkIn);
  while (toLocalDateKey(cursor) < checkOut) {
    nightKeys.push(toLocalDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return nightKeys;
};

export const countStayNights = (checkIn, checkOut) => buildStayNightKeys(checkIn, checkOut).length;

export const hasBlockedNight = (checkIn, checkOut, blockedDateKeys) =>
  buildStayNightKeys(checkIn, checkOut).some((nightKey) => blockedDateKeys?.has?.(nightKey) === true);

// Two-click range selection. A blocked day can end a stay (checkout is exclusive)
// but never start one; a click that would span a blocked night restarts the range.
export const selectStayDate = ({ range, dateKey, blockedDateKeys, todayKey }) => {
  const currentRange = range || EMPTY_STAY_RANGE;
  if (!isValidDateKey(dateKey) || (todayKey && dateKey < todayKey)) {
    return currentRange;
  }

  const { checkIn, checkOut } = currentRange;
  const isChoosingCheckOut = Boolean(checkIn) && !checkOut && dateKey > checkIn;
  if (isChoosingCheckOut && !hasBlockedNight(checkIn, dateKey, blockedDateKeys)) {
    return { checkIn, checkOut: dateKey };
  }

  if (blockedDateKeys?.has?.(dateKey) === true) {
    return currentRange;
  }

  return { checkIn: dateKey, checkOut: null };
};

export const formatMinorUnits = (amount, currency = "EUR") => {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return "";
  }
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(amount / 100);
};

export const formatStayDate = (dateKey) => {
  const date = parseLocalDate(dateKey);
  if (!date) {
    return "";
  }
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(date);
};

export const formatQuoteValidUntil = (expiresAt) => {
  const expiresAtMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresAtMs)) {
    return "";
  }
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(expiresAtMs));
};
