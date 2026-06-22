import { BadRequestException } from "./exception/badRequestException.js";

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const NUMERIC_TIMESTAMP_PATTERN = /^\d+$/;

const parseDateOnlyToUtcMs = (value, fieldName) => {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsedDate = new Date(timestamp);

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    throw new BadRequestException(`${fieldName} is invalid.`);
  }

  return timestamp;
};

const ensureFiniteTimestamp = (value, fieldName) => {
  if (!Number.isFinite(value)) {
    throw new BadRequestException(`${fieldName} is invalid.`);
  }

  return value;
};

export const parseBookingDateToMs = (value, fieldName) => {
  if (typeof value === "number") {
    return ensureFiniteTimestamp(value, fieldName);
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException(`${fieldName} is required.`);
    }

    const dateOnlyTimestamp = parseDateOnlyToUtcMs(normalized, fieldName);
    if (dateOnlyTimestamp !== null) {
      return dateOnlyTimestamp;
    }

    if (NUMERIC_TIMESTAMP_PATTERN.test(normalized)) {
      return ensureFiniteTimestamp(Number(normalized), fieldName);
    }

    return ensureFiniteTimestamp(Date.parse(normalized), fieldName);
  }

  throw new BadRequestException(`${fieldName} is required.`);
};
