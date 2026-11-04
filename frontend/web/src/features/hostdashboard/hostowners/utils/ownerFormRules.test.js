import {
  ARCHIVED_OWNER_STATUS,
  DEFAULT_OWNER_STATUS,
  EMAIL_PATTERN,
  LANGUAGE_PATTERN,
  OWNER_FIELD_MAX_LENGTHS,
  OWNER_FORM_FIELDS,
  OWNER_TYPES,
  OWNER_TYPES_REQUIRING_COMPANY_NAME,
  PHONE_PATTERN,
  SETTABLE_OWNER_STATUSES,
  buildCreatePayload,
  buildCreateRecord,
  buildUpdateChanges,
  emptyFormValues,
  fieldError,
  normalizeFieldValue,
  toFormValues,
  validateOwnerChanges,
} from "./ownerFormRules";
import cases from "./ownerFormRules.cases.json";

const OWNER_CONSTANTS_FILE = "backend/functions/property-owners/util/ownerConstants.js";
const OWNER_VALIDATOR_FILE = "backend/functions/property-owners/business/validation/ownerValidator.js";

const BACKEND_OWNER_FIELD_MAX_LENGTHS = Object.freeze({
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
const BACKEND_OWNER_TYPES = Object.freeze(["individual", "company", "trust"]);
const BACKEND_OWNER_TYPES_REQUIRING_COMPANY_NAME = Object.freeze(["company", "trust"]);
const BACKEND_OWNER_STATUSES = Object.freeze(["active", "inactive", "pending", "archived"]);
const BACKEND_ARCHIVED_OWNER_STATUS = "archived";
const BACKEND_DEFAULT_OWNER_STATUS = "active";
const BACKEND_EMAIL_PATTERN = String.raw`^[^\s@]+@[^\s@]+\.[^\s@.]+$`;
const BACKEND_PHONE_PATTERN = String.raw`^(?=.*\d)[\d +()\-.]+$`;
const BACKEND_LANGUAGE_PATTERN = String.raw`^[a-z]{2}(-[A-Z]{2})?$`;

const VALID_VALUES = Object.freeze({
  first_name: "Anna",
  last_name: "de Vries",
  company_name: "De Vries Holding",
  email: "anna@example.com",
  phone: "+31 6 12345678",
  preferred_language: "nl-NL",
  owner_type: "company",
  status: "active",
  notes: "Prefers email.",
});

const STORED_OWNER = Object.freeze({
  id: "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b",
  first_name: "Anna",
  last_name: "de Vries",
  company_name: null,
  email: "anna@example.com",
  phone: "+31 6 12345678",
  preferred_language: null,
  owner_type: "individual",
  status: "active",
  notes: null,
  properties: [],
});

const frontendAcceptsCreate = (values) => Object.keys(validateOwnerChanges(buildCreateRecord(values))).length === 0;

const frontendAcceptsUpdate = (changes, stored) => Object.keys(validateOwnerChanges(changes, stored)).length === 0;

const expandValue = (value) =>
  value !== null && typeof value === "object"
    ? `${value.prefix ?? ""}${value.char.repeat(value.repeat)}${value.suffix ?? ""}`
    : value;

const CREATE_CASES = cases.create.map(([field, value, accepted]) => [field, expandValue(value), accepted]);

const UPDATE_CASES = cases.update.map(([label, storedOverride, changes, accepted]) => [
  label,
  { ...STORED_OWNER, ...storedOverride },
  changes,
  accepted,
]);

const FIELD_ERROR_CASES = cases.fieldError.map(([field, value, expected]) => [field, expandValue(value), expected]);

describe("the rules match the backend values", () => {
  test(`max lengths match OWNER_FIELD_MAX_LENGTHS in ${OWNER_CONSTANTS_FILE}`, () => {
    expect(OWNER_FIELD_MAX_LENGTHS).toEqual(BACKEND_OWNER_FIELD_MAX_LENGTHS);
    expect(Object.keys(OWNER_FIELD_MAX_LENGTHS).sort()).toEqual([...OWNER_FORM_FIELDS].sort());
  });

  test(`owner types match OWNER_TYPES and OWNER_TYPES_REQUIRING_COMPANY_NAME in ${OWNER_CONSTANTS_FILE}`, () => {
    expect(OWNER_TYPES).toEqual(BACKEND_OWNER_TYPES);
    expect(OWNER_TYPES_REQUIRING_COMPANY_NAME).toEqual(BACKEND_OWNER_TYPES_REQUIRING_COMPANY_NAME);
  });

  test(`statuses match OWNER_STATUSES, ARCHIVED_OWNER_STATUS and DEFAULT_OWNER_STATUS in ${OWNER_CONSTANTS_FILE}`, () => {
    expect(ARCHIVED_OWNER_STATUS).toBe(BACKEND_ARCHIVED_OWNER_STATUS);
    expect(DEFAULT_OWNER_STATUS).toBe(BACKEND_DEFAULT_OWNER_STATUS);
    expect(SETTABLE_OWNER_STATUSES).toEqual(
      BACKEND_OWNER_STATUSES.filter((status) => status !== BACKEND_ARCHIVED_OWNER_STATUS)
    );
  });

  test(`patterns match EMAIL_PATTERN, PHONE_PATTERN and LANGUAGE_PATTERN in ${OWNER_VALIDATOR_FILE}`, () => {
    expect(EMAIL_PATTERN.source).toBe(BACKEND_EMAIL_PATTERN);
    expect(PHONE_PATTERN.source).toBe(BACKEND_PHONE_PATTERN);
    expect(LANGUAGE_PATTERN.source).toBe(BACKEND_LANGUAGE_PATTERN);
  });

  test.each(CREATE_CASES)(`create with %s = %p is accepted: %p, as validateCreateOwner in ${OWNER_VALIDATOR_FILE} returned`, (field, value, accepted) => {
    expect(frontendAcceptsCreate({ ...VALID_VALUES, [field]: value })).toBe(accepted);
  });

  test.each(cases.createCompany)(`create for a %s is accepted: %p, as validateCreateOwner in ${OWNER_VALIDATOR_FILE} returned`, (_label, override, accepted) => {
    expect(frontendAcceptsCreate({ ...VALID_VALUES, ...override })).toBe(accepted);
  });

  test.each(UPDATE_CASES)(`update for %s is accepted: %p, as validatePatchOwner in ${OWNER_VALIDATOR_FILE} returned`, (_label, stored, changes, accepted) => {
    expect(frontendAcceptsUpdate(changes, stored)).toBe(accepted);
  });
});


describe("fieldError", () => {
  test.each(FIELD_ERROR_CASES)("%s = %p gives %p", (field, value, expected) => {
    expect(fieldError(field, value)).toBe(expected);
  });

  test("never accepts archived as a status to set", () => {
    expect(SETTABLE_OWNER_STATUSES).not.toContain(ARCHIVED_OWNER_STATUS);
    expect(fieldError("status", ARCHIVED_OWNER_STATUS)).toBe("archivedStatus");
    expect(validateOwnerChanges({ status: ARCHIVED_OWNER_STATUS }, STORED_OWNER)).toEqual({ status: "archivedStatus" });
  });
});

describe("validateOwnerChanges", () => {
  test.each([["company"], ["trust"]])("requires a company name for %s", (ownerType) => {
    const values = { ...VALID_VALUES, owner_type: ownerType, company_name: "  " };

    expect(validateOwnerChanges(buildCreateRecord(values))).toEqual({ company_name: "companyNameRequired" });
  });

  test("does not require a company name for an individual", () => {
    const values = { ...VALID_VALUES, owner_type: "individual", company_name: "" };

    expect(validateOwnerChanges(buildCreateRecord(values))).toEqual({});
  });

  test("checks the company rule against the stored owner with the changes applied", () => {
    expect(validateOwnerChanges({ owner_type: "company" }, STORED_OWNER)).toEqual({
      company_name: "companyNameRequired",
    });
    expect(
      validateOwnerChanges({ owner_type: "trust" }, { ...STORED_OWNER, owner_type: "company", company_name: "AV BV" })
    ).toEqual({});
  });

  test("keeps a field error for the company name over the company rule", () => {
    const values = { ...VALID_VALUES, company_name: "a".repeat(201) };

    expect(validateOwnerChanges(buildCreateRecord(values))).toEqual({ company_name: "tooLong" });
  });

  test("reports every invalid field at once", () => {
    const values = { ...emptyFormValues(), email: "nope" };

    expect(validateOwnerChanges(buildCreateRecord(values))).toEqual({
      first_name: "required",
      last_name: "required",
      email: "invalidEmail",
      owner_type: "required",
    });
  });

  test("only checks the fields that change on update", () => {
    const storedWithOldPhone = { ...STORED_OWNER, phone: "no digits" };

    expect(validateOwnerChanges({ first_name: "Anne" }, storedWithOldPhone)).toEqual({});
  });
});

describe("building the request", () => {
  test("normalizeFieldValue trims and turns blank text into null", () => {
    expect(normalizeFieldValue("  Anna ")).toBe("Anna");
    expect(normalizeFieldValue("   ")).toBeNull();
    expect(normalizeFieldValue(null)).toBeNull();
  });

  test("create sends trimmed values and leaves empty optional fields out", () => {
    const values = {
      ...emptyFormValues(),
      first_name: "  Anna ",
      last_name: " de Vries",
      email: " anna@example.com ",
      owner_type: "individual",
      phone: "   ",
      notes: "  Line one\nLine two  ",
    };

    expect(buildCreatePayload(values)).toStrictEqual({
      first_name: "Anna",
      last_name: "de Vries",
      email: "anna@example.com",
      owner_type: "individual",
      status: "active",
      notes: "Line one\nLine two",
    });
  });

  test("create leaves the hidden company name out for an individual", () => {
    const values = { ...VALID_VALUES, owner_type: "individual", company_name: "Typed before switching" };

    expect(buildCreatePayload(values)).not.toHaveProperty("company_name");
  });

  test("update sends only the fields that changed", () => {
    const values = { ...toFormValues(STORED_OWNER), first_name: "Anne", notes: "New note" };

    expect(buildUpdateChanges(values, STORED_OWNER)).toStrictEqual({ first_name: "Anne", notes: "New note" });
  });

  test("update sends null for a cleared optional field", () => {
    const values = { ...toFormValues(STORED_OWNER), phone: "  " };

    expect(buildUpdateChanges(values, STORED_OWNER)).toStrictEqual({ phone: null });
  });

  test("update ignores changes that only add surrounding spaces", () => {
    const values = { ...toFormValues(STORED_OWNER), first_name: "  Anna  " };

    expect(buildUpdateChanges(values, STORED_OWNER)).toStrictEqual({});
  });

  test("update sends nothing for an untouched form", () => {
    expect(buildUpdateChanges(toFormValues(STORED_OWNER), STORED_OWNER)).toStrictEqual({});
  });

  test("update clears the stored company name when a company becomes an individual", () => {
    const stored = { ...STORED_OWNER, owner_type: "company", company_name: "AV BV" };
    const values = { ...toFormValues(stored), owner_type: "individual" };

    expect(buildUpdateChanges(values, stored)).toStrictEqual({ owner_type: "individual", company_name: null });
  });

  test("update clears the stored company name when a trust becomes an individual", () => {
    const stored = { ...STORED_OWNER, owner_type: "trust", company_name: "Family Trust" };
    const values = { ...toFormValues(stored), owner_type: "individual" };

    expect(buildUpdateChanges(values, stored)).toStrictEqual({ owner_type: "individual", company_name: null });
  });

  test("update sends nothing for an unchanged individual that has a stored company name", () => {
    const stored = { ...STORED_OWNER, company_name: "Old Company BV" };

    expect(buildUpdateChanges(toFormValues(stored), stored)).toStrictEqual({});
  });

  test("update leaves the stored company name of an individual alone when another field changes", () => {
    const stored = { ...STORED_OWNER, company_name: "Old Company BV" };
    const values = { ...toFormValues(stored), first_name: "Anne" };

    expect(buildUpdateChanges(values, stored)).toStrictEqual({ first_name: "Anne" });
  });

  test("update sends no company name for an individual without one", () => {
    const values = { ...toFormValues(STORED_OWNER), first_name: "Anne" };

    expect(buildUpdateChanges(values, STORED_OWNER)).toStrictEqual({ first_name: "Anne" });
  });

  test("update keeps the company name when a company becomes a trust", () => {
    const stored = { ...STORED_OWNER, owner_type: "company", company_name: "AV BV" };
    const values = { ...toFormValues(stored), owner_type: "trust" };

    expect(buildUpdateChanges(values, stored)).toStrictEqual({ owner_type: "trust" });
  });

  test("create falls back to the backend default status, like the backend", () => {
    const values = { ...VALID_VALUES, status: "" };

    expect(buildCreateRecord(values).status).toBe(DEFAULT_OWNER_STATUS);
    expect(buildCreatePayload(values).status).toBe(DEFAULT_OWNER_STATUS);
  });

  test("the form starts empty with the backend default status", () => {
    expect(emptyFormValues()).toStrictEqual({
      first_name: "",
      last_name: "",
      company_name: "",
      email: "",
      phone: "",
      preferred_language: "",
      owner_type: "",
      status: DEFAULT_OWNER_STATUS,
      notes: "",
    });
  });

  test("an edit form is prefilled from the owner, with empty text for null fields", () => {
    expect(toFormValues(STORED_OWNER)).toStrictEqual({
      first_name: "Anna",
      last_name: "de Vries",
      company_name: "",
      email: "anna@example.com",
      phone: "+31 6 12345678",
      preferred_language: "",
      owner_type: "individual",
      status: "active",
      notes: "",
    });
  });
});
