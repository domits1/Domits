const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const pad = (value) => String(value).padStart(2, "0");

export const toDateKey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const normalizeDateValue = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const normalizedValue = String(value || "").trim();
  if (!DATE_KEY_PATTERN.test(normalizedValue)) {
    return null;
  }

  const [year, month, day] = normalizedValue.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const buildUnavailableDateSet = (values) =>
  new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => String(value || "").trim())
      .filter((value) => DATE_KEY_PATTERN.test(value))
  );

export const isUnavailableDate = (value, unavailableValues) => {
  const normalizedDate = normalizeDateValue(value);
  if (!normalizedDate) {
    return false;
  }

  const unavailableDateSet =
    unavailableValues instanceof Set ? unavailableValues : buildUnavailableDateSet(unavailableValues);
  return unavailableDateSet.has(toDateKey(normalizedDate));
};

export const hasUnavailableDateInStayRange = (checkInValue, checkOutValue, unavailableValues) => {
  const checkInDate = normalizeDateValue(checkInValue);
  const checkOutDate = normalizeDateValue(checkOutValue);
  if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate) {
    return false;
  }

  const unavailableDateSet =
    unavailableValues instanceof Set ? unavailableValues : buildUnavailableDateSet(unavailableValues);
  for (
    let cursor = checkInDate;
    cursor < checkOutDate;
    cursor = new Date(cursor.valueOf() + DAY_IN_MS)
  ) {
    if (unavailableDateSet.has(toDateKey(cursor))) {
      return true;
    }
  }

  return false;
};

export const getFutureDateKey = (offsetDays) => toDateKey(new Date(Date.now() + offsetDays * DAY_IN_MS));

export const addDaysToDateKey = (value, days) => {
  const normalizedDate = normalizeDateValue(value);
  if (!normalizedDate) {
    return "";
  }

  return toDateKey(new Date(normalizedDate.valueOf() + days * DAY_IN_MS));
};
