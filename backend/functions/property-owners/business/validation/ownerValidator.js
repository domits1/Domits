import { BadRequestException } from "../../util/exception/badRequestException.js";
import {
  ARCHIVED_OWNER_STATUS,
  DEFAULT_OWNER_STATUS,
  OWNER_FIELD_MAX_LENGTHS,
  OWNER_STATUSES,
  OWNER_TYPES,
  OWNER_TYPES_REQUIRING_COMPANY_NAME,
  PROPERTY_ID_MAX_LENGTH,
} from "../../util/ownerConstants.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@.]+$/;
const PHONE_PATTERN = /^(?=.*\d)[\d +()\-.]+$/;
const LANGUAGE_PATTERN = /^[a-z]{2}(-[A-Z]{2})?$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LAST_ASCII_CONTROL_CODE = 0x1f;
const DELETE_CODE = 0x7f;
const MULTILINE_TEXT_CONTROL_CHARACTERS = Object.freeze(["\t", "\n", "\r"]);

const FIELD_RULES = Object.freeze({
  first_name: { required: true },
  last_name: { required: true },
  company_name: { required: false },
  email: { required: true, pattern: EMAIL_PATTERN, patternMessage: "email must be a valid email address." },
  phone: {
    required: false,
    pattern: PHONE_PATTERN,
    patternMessage: "phone must contain at least one digit and only digits, spaces and + ( ) - .",
  },
  preferred_language: {
    required: false,
    pattern: LANGUAGE_PATTERN,
    patternMessage: "preferred_language must be a language code such as en or nl-NL.",
  },
  owner_type: { required: true, allowed: OWNER_TYPES },
  status: { required: true, allowed: OWNER_STATUSES },
  notes: { required: false, allowedControlCharacters: MULTILINE_TEXT_CONTROL_CHARACTERS },
});

const WRITABLE_FIELDS = Object.freeze(Object.keys(FIELD_RULES));

const isControlCharacter = (character) => {
  const code = character.codePointAt(0);
  return code <= LAST_ASCII_CONTROL_CODE || code === DELETE_CODE;
};

const containsControlCharacter = (value, allowedControlCharacters = []) =>
  [...value].some((character) => isControlCharacter(character) && !allowedControlCharacters.includes(character));

const isPlainObject = (value) => Object.prototype.toString.call(value) === "[object Object]";

const assertWritableBody = (body) => {
  if (!isPlainObject(body)) {
    throw new BadRequestException("Request body must be a JSON object.");
  }
  const unknownFields = Object.keys(body).filter((key) => !WRITABLE_FIELDS.includes(key));
  if (unknownFields.length > 0) {
    throw new BadRequestException(`Unknown or read-only fields: ${unknownFields.join(", ")}.`);
  }
};

const normalizeField = (field, value) => {
  const rule = FIELD_RULES[field];
  if (value === null || value === undefined) {
    if (rule.required) throw new BadRequestException(`${field} is required.`);
    return null;
  }
  if (typeof value !== "string") {
    throw new BadRequestException(`${field} must be a string.`);
  }
  if (containsControlCharacter(value, rule.allowedControlCharacters)) {
    throw new BadRequestException(`${field} contains invalid characters.`);
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    if (rule.required) throw new BadRequestException(`${field} is required.`);
    return null;
  }
  const maxLength = OWNER_FIELD_MAX_LENGTHS[field];
  if (trimmed.length > maxLength) {
    throw new BadRequestException(`${field} must be at most ${maxLength} characters.`);
  }
  if (rule.pattern && !rule.pattern.test(trimmed)) {
    throw new BadRequestException(rule.patternMessage);
  }
  if (rule.allowed && !rule.allowed.includes(trimmed)) {
    throw new BadRequestException(`${field} must be one of: ${rule.allowed.join(", ")}.`);
  }
  return trimmed;
};

const assertNotArchived = (status) => {
  if (status === ARCHIVED_OWNER_STATUS) {
    throw new BadRequestException("status archived can only be set by archiving the owner.");
  }
};

const assertCompanyNameRule = (ownerType, companyName) => {
  if (OWNER_TYPES_REQUIRING_COMPANY_NAME.includes(ownerType) && !companyName) {
    throw new BadRequestException("company_name is required when owner_type is company or trust.");
  }
};

const normalizeCreateField = (field, value) => {
  const isStatusAbsent = field === "status" && (value === null || value === undefined);
  return isStatusAbsent ? DEFAULT_OWNER_STATUS : normalizeField(field, value);
};

export const validateCreateOwner = (body) => {
  assertWritableBody(body);
  const record = Object.fromEntries(WRITABLE_FIELDS.map((field) => [field, normalizeCreateField(field, body[field])]));
  assertNotArchived(record.status);
  assertCompanyNameRule(record.owner_type, record.company_name);
  return record;
};

export const validatePatchOwner = (body, existingOwner) => {
  assertWritableBody(body);
  const fields = Object.keys(body).filter((field) => body[field] !== undefined);
  if (fields.length === 0) {
    throw new BadRequestException("At least one field is required to update an owner.");
  }
  const changes = Object.fromEntries(fields.map((field) => [field, normalizeField(field, body[field])]));
  assertNotArchived(changes.status);
  const merged = { ...existingOwner, ...changes };
  assertCompanyNameRule(merged.owner_type, merged.company_name);
  return changes;
};

export const assertOwnerId = (id) => {
  if (typeof id !== "string" || !UUID_PATTERN.test(id)) {
    throw new BadRequestException("A valid owner id is required.");
  }
  return id;
};

export const assertPropertyId = (propertyId) => {
  if (propertyId === null || propertyId === undefined) {
    throw new BadRequestException("property_id is required.");
  }
  if (typeof propertyId !== "string") {
    throw new BadRequestException("property_id must be a string.");
  }
  if (containsControlCharacter(propertyId)) {
    throw new BadRequestException("property_id contains invalid characters.");
  }
  const trimmed = propertyId.trim();
  if (trimmed === "") {
    throw new BadRequestException("property_id is required.");
  }
  if (trimmed.length > PROPERTY_ID_MAX_LENGTH) {
    throw new BadRequestException(`property_id must be at most ${PROPERTY_ID_MAX_LENGTH} characters.`);
  }
  return trimmed;
};
