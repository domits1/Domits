export const OWNER_FORM_FIELDS = Object.freeze([
  "first_name",
  "last_name",
  "company_name",
  "email",
  "phone",
  "preferred_language",
  "owner_type",
  "status",
  "notes",
]);

export const OWNER_TYPES = Object.freeze(["individual", "company", "trust"]);
export const OWNER_TYPES_REQUIRING_COMPANY_NAME = Object.freeze(["company", "trust"]);
export const SETTABLE_OWNER_STATUSES = Object.freeze(["active", "inactive", "pending"]);
export const ARCHIVED_OWNER_STATUS = "archived";
export const DEFAULT_OWNER_STATUS = "active";

export const OWNER_FIELD_MAX_LENGTHS = Object.freeze({
  first_name: 100,
  last_name: 100,
  company_name: 200,
  email: 254,
  phone: 50,
  preferred_language: 10,
  owner_type: 20,
  status: 20,
  notes: 2000,
});

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@.]+$/;
export const PHONE_PATTERN = /^(?=.*\d)[\d +()\-.]+$/;
export const LANGUAGE_PATTERN = /^[a-z]{2}(-[A-Z]{2})?$/;

const REQUIRED_FIELDS = Object.freeze(["first_name", "last_name", "email", "owner_type", "status"]);
const LAST_ASCII_CONTROL_CODE = 0x1f;
const DELETE_CODE = 0x7f;
const MULTILINE_CONTROL_CHARACTERS = Object.freeze(["\t", "\n", "\r"]);

const PATTERN_RULES = Object.freeze({
  email: { pattern: EMAIL_PATTERN, errorKey: "invalidEmail" },
  phone: { pattern: PHONE_PATTERN, errorKey: "invalidPhone" },
  preferred_language: { pattern: LANGUAGE_PATTERN, errorKey: "invalidLanguage" },
});

const isControlCharacter = (character) => {
  const code = character.codePointAt(0);
  return code <= LAST_ASCII_CONTROL_CODE || code === DELETE_CODE;
};

const containsInvalidCharacter = (field, value) => {
  const allowed = field === "notes" ? MULTILINE_CONTROL_CHARACTERS : [];
  return [...value].some((character) => isControlCharacter(character) && !allowed.includes(character));
};

const allowedValueError = (field, value) => {
  if (field === "owner_type" && !OWNER_TYPES.includes(value)) {
    return "invalidOwnerType";
  }
  if (field === "status" && value === ARCHIVED_OWNER_STATUS) {
    return "archivedStatus";
  }
  if (field === "status" && !SETTABLE_OWNER_STATUSES.includes(value)) {
    return "invalidStatus";
  }
  return null;
};

export const normalizeFieldValue = (value) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

export const fieldError = (field, value) => {
  if (value === null) {
    return REQUIRED_FIELDS.includes(field) ? "required" : null;
  }
  if (containsInvalidCharacter(field, value)) {
    return "invalidCharacters";
  }
  if (value.length > OWNER_FIELD_MAX_LENGTHS[field]) {
    return "tooLong";
  }
  const patternRule = PATTERN_RULES[field];
  if (patternRule && !patternRule.pattern.test(value)) {
    return patternRule.errorKey;
  }
  return allowedValueError(field, value);
};

export const requiresCompanyName = (ownerType) => OWNER_TYPES_REQUIRING_COMPANY_NAME.includes(ownerType);

export const validateOwnerChanges = (changes, storedOwner = {}) => {
  const errors = {};
  OWNER_FORM_FIELDS.filter((field) => field in changes).forEach((field) => {
    const error = fieldError(field, changes[field]);
    if (error) {
      errors[field] = error;
    }
  });
  const merged = { ...storedOwner, ...changes };
  if (!errors.company_name && requiresCompanyName(merged.owner_type) && !merged.company_name) {
    errors.company_name = "companyNameRequired";
  }
  return errors;
};

export const isFieldShown = (field, ownerType) => field !== "company_name" || requiresCompanyName(ownerType);

const shownEntries = (values) =>
  OWNER_FORM_FIELDS.filter((field) => isFieldShown(field, values.owner_type)).map((field) => [
    field,
    normalizeFieldValue(values[field]),
  ]);

export const buildCreateRecord = (values) => {
  const record = Object.fromEntries(shownEntries(values));
  return { ...record, status: record.status ?? DEFAULT_OWNER_STATUS };
};

export const buildCreatePayload = (values) =>
  Object.fromEntries(Object.entries(buildCreateRecord(values)).filter(([, value]) => value !== null));

export const buildUpdateChanges = (values, storedOwner) => {
  const changes = Object.fromEntries(
    shownEntries(values).filter(([field, value]) => value !== normalizeFieldValue(storedOwner[field]))
  );
  const becomesIndividual =
    requiresCompanyName(storedOwner.owner_type) && !requiresCompanyName(normalizeFieldValue(values.owner_type));
  const clearsCompanyName = becomesIndividual && normalizeFieldValue(storedOwner.company_name) !== null;
  return clearsCompanyName ? { ...changes, company_name: null } : changes;
};

export const toFormValues = (owner) =>
  Object.fromEntries(
    OWNER_FORM_FIELDS.map((field) => [field, typeof owner?.[field] === "string" ? owner[field] : ""])
  );

export const emptyFormValues = () => ({ ...toFormValues(null), status: DEFAULT_OWNER_STATUS });
