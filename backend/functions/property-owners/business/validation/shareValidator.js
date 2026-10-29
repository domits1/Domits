import { BadRequestException } from "../../util/exception/badRequestException.js";
import { assertOwnerId, assertPropertyId } from "./ownerValidator.js";

export const MAX_SHARES_PER_REQUEST = 100;
export const TOTAL_BASIS_POINTS = 10000;
export const MIN_BASIS_POINTS = 1;

const DAY_MS = 86400000;
const MAX_EFFECTIVE_FROM_DAYS_AHEAD = 1826;
const BODY_FIELDS = Object.freeze(["property_id", "effective_from", "shares"]);
const SHARE_FIELDS = Object.freeze(["owner_id", "ownership_basis_points"]);

const isPlainObject = (value) => Object.prototype.toString.call(value) === "[object Object]";

const hasExactKeys = (value, fields) => {
  const keys = Object.keys(value);
  return keys.length === fields.length && fields.every((field) => Object.hasOwn(value, field));
};

const assertBodyShape = (body) => {
  if (!isPlainObject(body)) {
    throw new BadRequestException("Request body must be a JSON object.");
  }
  const unknownFields = Object.keys(body).filter((key) => !BODY_FIELDS.includes(key));
  if (unknownFields.length > 0) {
    throw new BadRequestException(`Unknown fields: ${unknownFields.join(", ")}.`);
  }
  const missingFields = BODY_FIELDS.filter((field) => !Object.hasOwn(body, field));
  if (missingFields.length > 0) {
    throw new BadRequestException(`Missing fields: ${missingFields.join(", ")}.`);
  }
};

const assertEffectiveFrom = (effectiveFrom, today) => {
  if (!Number.isSafeInteger(effectiveFrom)) {
    throw new BadRequestException("effective_from must be an integer in epoch milliseconds.");
  }
  if (effectiveFrom % DAY_MS !== 0) {
    throw new BadRequestException("effective_from must be a UTC midnight.");
  }
  if (effectiveFrom < today) {
    throw new BadRequestException("effective_from cannot be before today.");
  }
  if (effectiveFrom > today + MAX_EFFECTIVE_FROM_DAYS_AHEAD * DAY_MS) {
    throw new BadRequestException("effective_from cannot be more than 5 years after today.");
  }
  return effectiveFrom;
};

const assertShareList = (shares) => {
  if (!Array.isArray(shares)) {
    throw new BadRequestException("shares must be an array.");
  }
  if (shares.length > MAX_SHARES_PER_REQUEST) {
    throw new BadRequestException(`shares must contain at most ${MAX_SHARES_PER_REQUEST} entries.`);
  }
};

const isValidBasisPoints = (value) =>
  Number.isSafeInteger(value) && value >= MIN_BASIS_POINTS && value <= TOTAL_BASIS_POINTS;

const normalizeShare = (entry) => {
  if (!isPlainObject(entry)) {
    throw new BadRequestException("Each share must be an object.");
  }
  if (!hasExactKeys(entry, SHARE_FIELDS)) {
    throw new BadRequestException("Each share must contain exactly owner_id and ownership_basis_points.");
  }
  const ownerId = assertOwnerId(entry.owner_id).toLowerCase();
  if (!isValidBasisPoints(entry.ownership_basis_points)) {
    throw new BadRequestException(
      `ownership_basis_points must be an integer from ${MIN_BASIS_POINTS} to ${TOTAL_BASIS_POINTS}.`
    );
  }
  return { owner_id: ownerId, ownership_basis_points: entry.ownership_basis_points };
};

const assertUniqueOwners = (shares) => {
  if (new Set(shares.map((entry) => entry.owner_id)).size !== shares.length) {
    throw new BadRequestException("Each owner can appear only once.");
  }
};

const assertTotal = (shares) => {
  const total = shares.reduce((sum, entry) => sum + entry.ownership_basis_points, 0);
  if (shares.length > 0 && total !== TOTAL_BASIS_POINTS) {
    throw new BadRequestException(`Shares must add up to exactly ${TOTAL_BASIS_POINTS} basis points.`);
  }
};

export const validateSetShares = (body, today) => {
  assertBodyShape(body);
  const propertyId = assertPropertyId(body.property_id);
  const effectiveFrom = assertEffectiveFrom(body.effective_from, today);
  assertShareList(body.shares);
  const shares = body.shares.map(normalizeShare);
  assertUniqueOwners(shares);
  assertTotal(shares);
  return { propertyId, effectiveFrom, shares };
};
