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

const repeat = (length, character = "a") => character.repeat(length);

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

  test.each([
    ["first_name", "Anna", true],
    ["first_name", "", false],
    ["first_name", "   ", false],
    ["first_name", " Anna ", true],
    ["first_name", repeat(100), true],
    ["first_name", repeat(101), false],
    ["first_name", `  ${repeat(100)}  `, true],
    ["first_name", "An\u0007na", false],
    ["first_name", "An\nna", false],
    ["last_name", repeat(100), true],
    ["last_name", repeat(101), false],
    ["last_name", "", false],
    ["company_name", repeat(200), true],
    ["company_name", repeat(201), false],
    ["email", "anna@example.com", true],
    ["email", "a@b.c", true],
    ["email", "  anna@example.com  ", true],
    ["email", "a@b", false],
    ["email", "a b@c.de", false],
    ["email", "a@b.c.", false],
    ["email", "a@b.c.d", true],
    ["email", "@b.cd", false],
    ["email", "a@@b.cd", false],
    ["email", `${repeat(248)}@b.com`, true],
    ["email", `${repeat(249)}@b.com`, false],
    ["email", "", false],
    ["phone", "+31 6 12345678", true],
    ["phone", "(020) 123-45.67", true],
    ["phone", "1", true],
    ["phone", "+", false],
    ["phone", "() -.", false],
    ["phone", "12a", false],
    ["phone", "06/12345678", false],
    ["phone", repeat(50, "1"), true],
    ["phone", repeat(51, "1"), false],
    ["phone", "", true],
    ["preferred_language", "en", true],
    ["preferred_language", "nl-NL", true],
    ["preferred_language", "EN", false],
    ["preferred_language", "nl-nl", false],
    ["preferred_language", "nl_NL", false],
    ["preferred_language", "nld", false],
    ["preferred_language", "n", false],
    ["preferred_language", "nl-NLD", false],
    ["preferred_language", "", true],
    ["owner_type", "individual", true],
    ["owner_type", "company", true],
    ["owner_type", "trust", true],
    ["owner_type", "Company", false],
    ["owner_type", "person", false],
    ["owner_type", "", false],
    ["status", "active", true],
    ["status", "inactive", true],
    ["status", "pending", true],
    ["status", "archived", false],
    ["status", "Active", false],
    ["status", "deleted", false],
    ["status", "", true],
    ["notes", "Line one\nLine two\twith a tab\r\n", true],
    ["notes", repeat(2000), true],
    ["notes", repeat(2001), false],
    ["notes", "Bell \u0007", false],
    ["notes", "Delete \u007f", false],
    ["notes", "", true],
  ])(`create with %s = %p is accepted: %p, as validateCreateOwner in ${OWNER_VALIDATOR_FILE} returned`, (field, value, accepted) => {
    expect(frontendAcceptsCreate({ ...VALID_VALUES, [field]: value })).toBe(accepted);
  });

  test.each([
    ["company with a company name", { owner_type: "company", company_name: "De Vries Holding" }, true],
    ["company without a company name", { owner_type: "company", company_name: "" }, false],
    ["trust with a company name", { owner_type: "trust", company_name: "Family Trust" }, true],
    ["trust without a company name", { owner_type: "trust", company_name: "   " }, false],
    ["individual without a company name", { owner_type: "individual", company_name: "" }, true],
  ])(`create for a %s is accepted: %p, as validateCreateOwner in ${OWNER_VALIDATOR_FILE} returned`, (_label, override, accepted) => {
    expect(frontendAcceptsCreate({ ...VALID_VALUES, ...override })).toBe(accepted);
  });

  test.each([
    ["an individual becoming a company without a name", STORED_OWNER, { owner_type: "company" }, false],
    ["an individual becoming a company with a name", STORED_OWNER, { owner_type: "company", company_name: "AV BV" }, true],
    ["a company clearing its name", { ...STORED_OWNER, owner_type: "company", company_name: "AV BV" }, { company_name: null }, false],
    ["a company becoming a trust", { ...STORED_OWNER, owner_type: "company", company_name: "AV BV" }, { owner_type: "trust" }, true],
    [
      "a company becoming an individual and clearing its name",
      { ...STORED_OWNER, owner_type: "company", company_name: "AV BV" },
      { owner_type: "individual", company_name: null },
      true,
    ],
    ["an archived owner changing a name", { ...STORED_OWNER, status: "archived" }, { first_name: "Anne" }, true],
    ["an archived owner being restored", { ...STORED_OWNER, status: "archived" }, { status: "active" }, true],
    ["an owner being archived", STORED_OWNER, { status: "archived" }, false],
    ["clearing a required field", STORED_OWNER, { email: null }, false],
    ["clearing an optional field", STORED_OWNER, { phone: null }, true],
  ])(`update for %s is accepted: %p, as validatePatchOwner in ${OWNER_VALIDATOR_FILE} returned`, (_label, stored, changes, accepted) => {
    expect(frontendAcceptsUpdate(changes, stored)).toBe(accepted);
  });
});


describe("fieldError", () => {
  test.each([
    ["first_name", null, "required"],
    ["last_name", null, "required"],
    ["email", null, "required"],
    ["owner_type", null, "required"],
    ["status", null, "required"],
    ["company_name", null, null],
    ["phone", null, null],
    ["preferred_language", null, null],
    ["notes", null, null],
    ["first_name", "a".repeat(100), null],
    ["first_name", "a".repeat(101), "tooLong"],
    ["last_name", "a".repeat(101), "tooLong"],
    ["company_name", "a".repeat(201), "tooLong"],
    ["email", `${"a".repeat(249)}@b.com`, "tooLong"],
    ["phone", "1".repeat(51), "tooLong"],
    ["preferred_language", "nl-NL-abcde", "tooLong"],
    ["notes", "a".repeat(2000), null],
    ["notes", "a".repeat(2001), "tooLong"],
    ["first_name", "An\tna", "invalidCharacters"],
    ["notes", "Tab\tand\nnew line", null],
    ["notes", "Null \u0000", "invalidCharacters"],
    ["email", "anna@example", "invalidEmail"],
    ["phone", "no digits", "invalidPhone"],
    ["phone", "+", "invalidPhone"],
    ["preferred_language", "dutch", "invalidLanguage"],
    ["owner_type", "partnership", "invalidOwnerType"],
    ["status", "deleted", "invalidStatus"],
    ["status", "archived", "archivedStatus"],
  ])("%s = %p gives %p", (field, value, expected) => {
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
