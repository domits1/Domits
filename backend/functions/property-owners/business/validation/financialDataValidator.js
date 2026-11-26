import { BadRequestException } from "../../util/exception/badRequestException.js";
import { assertOwnerId } from "./ownerValidator.js";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;
const MAX_OFFSET = 1000000;
const ALLOWED_FIELDS = new Set(["action", "id", "period_start_ms", "period_end_ms", "limit", "offset"]);

const parseInteger = (value, field, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) => {
  if (typeof value !== "string" || !/^(0|[1-9]\d*)$/.test(value)) {
    throw new BadRequestException(`${field} must be a non-negative integer.`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw new BadRequestException(`${field} must be between ${min} and ${max}.`);
  }
  return parsed;
};

export const validateFinancialDataQuery = (query = {}) => {
  if (!query || typeof query !== "object" || Array.isArray(query)) {
    throw new BadRequestException("Financial data query parameters are invalid.");
  }

  const unknownFields = Object.keys(query).filter((field) => !ALLOWED_FIELDS.has(field));
  if (unknownFields.length > 0) {
    throw new BadRequestException(`Unknown query parameters: ${unknownFields.join(", ")}.`);
  }
  if (query.action !== "financial-data") {
    throw new BadRequestException("action must be financial-data.");
  }

  const ownerId = assertOwnerId(query.id);
  const periodStartMs = parseInteger(query.period_start_ms, "period_start_ms");
  const periodEndMs = parseInteger(query.period_end_ms, "period_end_ms");

  if (periodEndMs <= periodStartMs) {
    throw new BadRequestException("period_end_ms must be later than period_start_ms.");
  }

  const limit = query.limit === undefined ? DEFAULT_LIMIT : parseInteger(query.limit, "limit", { min: 1, max: MAX_LIMIT });
  const offset = query.offset === undefined ? 0 : parseInteger(query.offset, "offset", { max: MAX_OFFSET });

  return { ownerId, periodStartMs, periodEndMs, limit, offset };
};
