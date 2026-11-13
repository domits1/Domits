const {
  validateCreateOwner,
  validatePatchOwner,
  assertOwnerId,
  assertPropertyId,
} = require("../../functions/property-owners/business/validation/ownerValidator.js");
const {
  OWNER_STATUSES,
  OWNER_TYPES,
  OWNER_FIELD_MAX_LENGTHS,
  PROPERTY_ID_MAX_LENGTH,
} = require("../../functions/property-owners/util/ownerConstants.js");

const VALID_UUID = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";

const individualBody = (overrides = {}) => ({
  first_name: "Anna",
  last_name: "de Vries",
  email: "anna@example.com",
  owner_type: "individual",
  ...overrides,
});

const companyOwner = {
  id: VALID_UUID,
  host_id: "host-1",
  first_name: "Bram",
  last_name: "Jansen",
  company_name: "Jansen Holding",
  email: "bram@example.com",
  owner_type: "company",
  status: "active",
};

const individualOwner = { ...companyOwner, company_name: null, owner_type: "individual" };

const CONTROL_CHARACTERS = ["\u0000", "\t", "\n", "\u001B", "\u001F", "\u007F"];

const VALID_VALUES = {
  first_name: "Anna",
  last_name: "de Vries",
  company_name: "Anna BV",
  email: "anna@example.com",
  phone: "0612345678",
  preferred_language: "nl",
  owner_type: "individual",
  status: "active",
};

const emailOfLength = (length) => `${"a".repeat(length - "@example.com".length)}@example.com`;

const expectBadRequest = (action, message) => {
  let thrown;
  try {
    action();
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeDefined();
  expect(thrown.statusCode).toBe(400);
  if (message) expect(thrown.message).toMatch(message);
};

describe("validateCreateOwner", () => {
  test("returns a clean record with nullable fields set to null and status defaulted to active", () => {
    expect(validateCreateOwner(individualBody())).toEqual({
      first_name: "Anna",
      last_name: "de Vries",
      company_name: null,
      email: "anna@example.com",
      phone: null,
      preferred_language: null,
      owner_type: "individual",
      status: "active",
      notes: null,
    });
  });

  test("trims every string field before storing it", () => {
    const record = validateCreateOwner({
      first_name: "  Anna ",
      last_name: " de Vries  ",
      company_name: "  Anna BV ",
      email: " anna@example.com ",
      phone: " +31 6 1234 5678 ",
      preferred_language: " nl-NL ",
      owner_type: " individual ",
      status: " pending ",
      notes: "  Prefers email  ",
    });

    expect(record).toEqual({
      first_name: "Anna",
      last_name: "de Vries",
      company_name: "Anna BV",
      email: "anna@example.com",
      phone: "+31 6 1234 5678",
      preferred_language: "nl-NL",
      owner_type: "individual",
      status: "pending",
      notes: "Prefers email",
    });
  });

  test("treats a null status as absent and defaults it to active", () => {
    expect(validateCreateOwner(individualBody({ status: null })).status).toBe("active");
  });

  test.each(OWNER_TYPES)("accepts owner_type %s", (ownerType) => {
    const record = validateCreateOwner(individualBody({ owner_type: ownerType, company_name: "Owner Holding" }));
    expect(record.owner_type).toBe(ownerType);
  });

  test.each(["co-owner", "Individual", "COMPANY", "partnership", "archived"])("rejects owner_type %s", (ownerType) => {
    expectBadRequest(() => validateCreateOwner(individualBody({ owner_type: ownerType })), /owner_type must be one of/);
  });

  test.each(OWNER_STATUSES.filter((status) => status !== "archived"))("accepts status %s", (status) => {
    expect(validateCreateOwner(individualBody({ status })).status).toBe(status);
  });

  test("refuses status archived, which only the archive route may set", () => {
    expectBadRequest(() => validateCreateOwner(individualBody({ status: "archived" })), /archiv/);
  });

  test.each(["Active", "deleted", "suspended"])("rejects status %s", (status) => {
    expectBadRequest(() => validateCreateOwner(individualBody({ status })), /status must be one of/);
  });

  test.each(["first_name", "last_name", "email", "owner_type"])("requires %s", (field) => {
    const body = individualBody();
    delete body[field];
    expectBadRequest(() => validateCreateOwner(body), new RegExp(`${field} is required`));
  });

  test.each(["first_name", "last_name", "email", "owner_type"])("rejects %s when it is null or blank", (field) => {
    expectBadRequest(() => validateCreateOwner(individualBody({ [field]: null })), new RegExp(`${field} is required`));
    expectBadRequest(() => validateCreateOwner(individualBody({ [field]: "   " })), new RegExp(`${field} is required`));
  });

  test.each([
    ["first_name", (length) => "a".repeat(length)],
    ["last_name", (length) => "a".repeat(length)],
    ["company_name", (length) => "a".repeat(length)],
    ["email", emailOfLength],
    ["phone", (length) => "1".repeat(length)],
    ["notes", (length) => "a".repeat(length)],
  ])("accepts %s at its maximum length and rejects one character more", (field, valueOfLength) => {
    const max = OWNER_FIELD_MAX_LENGTHS[field];

    expect(validateCreateOwner(individualBody({ [field]: valueOfLength(max) }))[field]).toHaveLength(max);
    expectBadRequest(
      () => validateCreateOwner(individualBody({ [field]: valueOfLength(max + 1) })),
      new RegExp(`${field} must be at most ${max} characters`)
    );
  });

  test("measures the maximum length after trimming", () => {
    const record = validateCreateOwner(individualBody({ first_name: `  ${"a".repeat(100)}  ` }));
    expect(record.first_name).toHaveLength(100);
  });

  test.each(["anna", "anna@", "@example.com", "anna@example", "anna example@example.com", "anna@example.com."])(
    "rejects email %s",
    (email) => {
      expectBadRequest(() => validateCreateOwner(individualBody({ email })), /email must be a valid email address/);
    }
  );

  test.each(["+31 (0)6-12.34.56.78", "0612345678", "+1 555 0100"])("accepts phone %s", (phone) => {
    expect(validateCreateOwner(individualBody({ phone })).phone).toBe(phone);
  });

  test.each(["06abc", "06_12", "+31#6", "06/1234"])("rejects phone %s", (phone) => {
    expectBadRequest(() => validateCreateOwner(individualBody({ phone })), /phone must contain at least one digit/);
  });

  test.each(["--", "+()", "+-().", " - "])("rejects phone %p because it has no digit", (phone) => {
    expectBadRequest(() => validateCreateOwner(individualBody({ phone })), /phone must contain at least one digit/);
  });

  test.each(
    ["first_name", "last_name", "company_name", "email", "phone", "preferred_language", "owner_type", "status"].flatMap(
      (field) => CONTROL_CHARACTERS.map((character) => [field, character])
    )
  )("rejects %s containing the control character %j", (field, character) => {
    const value = `${VALID_VALUES[field].slice(0, 1)}${character}${VALID_VALUES[field].slice(1)}`;
    expectBadRequest(
      () => validateCreateOwner(individualBody({ [field]: value })),
      new RegExp(`${field} contains invalid characters`)
    );
  });

  test.each(["\t", "\n", "\r"])(
    "rejects %j in a single-line field, even at the edge where trimming would remove it",
    (character) => {
      expectBadRequest(
        () => validateCreateOwner(individualBody({ first_name: `Anna${character}` })),
        /first_name contains invalid characters/
      );
    }
  );

  test.each([
    ["a tab", "Line one\tindented"],
    ["a line feed", "Line one\nLine two"],
    ["a carriage return and line feed", "Line one\r\nLine two"],
  ])("keeps %s inside notes", (_label, notes) => {
    expect(validateCreateOwner(individualBody({ notes })).notes).toBe(notes);
  });

  test.each(["\u0000", "\u0001", "\u000B", "\u000C", "\u001B", "\u001F", "\u007F"])(
    "rejects notes containing the control character %j",
    (character) => {
      expectBadRequest(
        () => validateCreateOwner(individualBody({ notes: `Line one${character}Line two` })),
        /notes contains invalid characters/
      );
    }
  );

  test.each(["en", "nl", "nl-NL", "en-GB"])("accepts preferred_language %s", (language) => {
    expect(validateCreateOwner(individualBody({ preferred_language: language })).preferred_language).toBe(language);
  });

  test.each(["EN", "eng", "en-nl", "en_GB", "nl-NLD", "e"])("rejects preferred_language %s", (language) => {
    expectBadRequest(
      () => validateCreateOwner(individualBody({ preferred_language: language })),
      /preferred_language must be/
    );
  });

  test.each(["company", "trust"])("requires company_name when owner_type is %s", (ownerType) => {
    expectBadRequest(
      () => validateCreateOwner(individualBody({ owner_type: ownerType })),
      /company_name is required when owner_type is company or trust/
    );
    expectBadRequest(
      () => validateCreateOwner(individualBody({ owner_type: ownerType, company_name: null })),
      /company_name is required/
    );
    expectBadRequest(
      () => validateCreateOwner(individualBody({ owner_type: ownerType, company_name: "  " })),
      /company_name is required/
    );
  });

  test("allows an individual without company_name", () => {
    expect(validateCreateOwner(individualBody()).company_name).toBeNull();
  });

  test.each(["company_name", "notes", "phone", "preferred_language"])(
    "stores an empty, blank or null %s as null",
    (field) => {
      expect(validateCreateOwner(individualBody({ [field]: "" }))[field]).toBeNull();
      expect(validateCreateOwner(individualBody({ [field]: "   " }))[field]).toBeNull();
      expect(validateCreateOwner(individualBody({ [field]: null }))[field]).toBeNull();
    }
  );

  test.each(["host_id", "id", "owner_user_id", "created_at", "updated_at", "property_ids", "unknown"])(
    "rejects the unknown or read-only field %s",
    (field) => {
      expectBadRequest(() => validateCreateOwner(individualBody({ [field]: "value" })), new RegExp(field));
    }
  );

  test("rejects a __proto__ key from a parsed JSON body", () => {
    const body = { ...JSON.parse('{"__proto__": {"status": "archived"}}'), ...individualBody() };
    expectBadRequest(() => validateCreateOwner(body), /__proto__/);
  });

  test.each([
    ["null", null],
    ["undefined", undefined],
    ["an array", [individualBody()]],
    ["a string", "first_name=Anna"],
    ["a number", 42],
  ])("rejects a body that is %s", (_label, body) => {
    expectBadRequest(() => validateCreateOwner(body), /Request body must be a JSON object/);
  });

  test.each([
    "first_name",
    "last_name",
    "company_name",
    "email",
    "phone",
    "preferred_language",
    "owner_type",
    "status",
    "notes",
  ])("rejects a non-string %s", (field) => {
    [42, true, { value: "x" }, ["x"]].forEach((value) => {
      expectBadRequest(
        () => validateCreateOwner(individualBody({ [field]: value })),
        new RegExp(`${field} must be a string`)
      );
    });
  });
});

describe("validatePatchOwner", () => {
  test("returns only the fields that were sent, trimmed", () => {
    expect(validatePatchOwner({ first_name: " Bea ", notes: " Call first " }, individualOwner)).toEqual({
      first_name: "Bea",
      notes: "Call first",
    });
  });

  test("rejects a patch without any field", () => {
    expectBadRequest(() => validatePatchOwner({}, individualOwner), /At least one field is required/);
  });

  test.each(["first_name", "last_name", "email", "owner_type", "status"])(
    "rejects clearing the required field %s",
    (field) => {
      expectBadRequest(
        () => validatePatchOwner({ [field]: null }, individualOwner),
        new RegExp(`${field} is required`)
      );
      expectBadRequest(() => validatePatchOwner({ [field]: " " }, individualOwner), new RegExp(`${field} is required`));
    }
  );

  test.each(["notes", "phone", "preferred_language", "company_name"])(
    "allows clearing %s on an individual",
    (field) => {
      expect(validatePatchOwner({ [field]: null }, individualOwner)).toEqual({ [field]: null });
      expect(validatePatchOwner({ [field]: "" }, individualOwner)).toEqual({ [field]: null });
    }
  );

  test("applies the create rules to every field that is sent", () => {
    expectBadRequest(() => validatePatchOwner({ email: "not-an-email" }, individualOwner), /valid email/);
    expectBadRequest(() => validatePatchOwner({ last_name: "a".repeat(101) }, individualOwner), /at most 100/);
    expectBadRequest(
      () => validatePatchOwner({ owner_type: "co-owner" }, individualOwner),
      /owner_type must be one of/
    );
    expectBadRequest(() => validatePatchOwner({ phone: 612345678 }, individualOwner), /phone must be a string/);
  });

  test("rejects control characters in a patched field", () => {
    expectBadRequest(
      () => validatePatchOwner({ last_name: "Jan\u0000sen" }, individualOwner),
      /last_name contains invalid characters/
    );
    expectBadRequest(
      () => validatePatchOwner({ notes: "Call\u0007first" }, individualOwner),
      /notes contains invalid characters/
    );
  });

  test("keeps line breaks in patched notes", () => {
    expect(validatePatchOwner({ notes: "Line one\r\nLine two" }, individualOwner)).toEqual({
      notes: "Line one\r\nLine two",
    });
  });

  test("refuses status archived", () => {
    expectBadRequest(() => validatePatchOwner({ status: "archived" }, individualOwner), /archiv/);
  });

  test.each(["active", "inactive", "pending"])("accepts status %s, which also restores an archived owner", (status) => {
    expect(validatePatchOwner({ status }, { ...individualOwner, status: "archived" })).toEqual({ status });
  });

  test.each(["company", "trust"])("rejects changing an individual to %s without a company_name", (ownerType) => {
    expectBadRequest(
      () => validatePatchOwner({ owner_type: ownerType }, individualOwner),
      /company_name is required when owner_type is company or trust/
    );
  });

  test("accepts changing an individual to company together with a company_name", () => {
    expect(validatePatchOwner({ owner_type: "company", company_name: "Bea BV" }, individualOwner)).toEqual({
      owner_type: "company",
      company_name: "Bea BV",
    });
  });

  test("accepts changing a company to trust when the existing company_name stays", () => {
    expect(validatePatchOwner({ owner_type: "trust" }, companyOwner)).toEqual({ owner_type: "trust" });
  });

  test("rejects clearing company_name on a company owner", () => {
    expectBadRequest(() => validatePatchOwner({ company_name: null }, companyOwner), /company_name is required/);
  });

  test("accepts changing a company to an individual while clearing company_name", () => {
    expect(validatePatchOwner({ owner_type: "individual", company_name: null }, companyOwner)).toEqual({
      owner_type: "individual",
      company_name: null,
    });
  });

  test.each(["host_id", "id", "owner_user_id", "created_at", "updated_at"])(
    "rejects the read-only field %s",
    (field) => {
      expectBadRequest(() => validatePatchOwner({ [field]: "value" }, individualOwner), new RegExp(field));
    }
  );

  test.each([null, [], "status=active"])("rejects a body that is not a JSON object: %p", (body) => {
    expectBadRequest(() => validatePatchOwner(body, individualOwner), /Request body must be a JSON object/);
  });
});

describe("assertOwnerId", () => {
  test("returns a valid UUID", () => {
    expect(assertOwnerId(VALID_UUID)).toBe(VALID_UUID);
    expect(assertOwnerId(VALID_UUID.toUpperCase())).toBe(VALID_UUID.toUpperCase());
  });

  test.each([
    ["undefined", undefined],
    ["null", null],
    ["empty", ""],
    ["not a uuid", "owner-1"],
    ["a uuid with extra characters", `${VALID_UUID}x`],
    ["a uuid with surrounding spaces", ` ${VALID_UUID} `],
    ["a uuid without dashes", VALID_UUID.replaceAll("-", "")],
    ["a number", 42],
  ])("rejects %s", (_label, id) => {
    expectBadRequest(() => assertOwnerId(id), /valid owner id/);
  });
});

describe("assertPropertyId", () => {
  test("returns the trimmed property id", () => {
    expect(assertPropertyId("  property-1 ")).toBe("property-1");
  });

  test("accepts a property id at the maximum length and rejects one character more", () => {
    expect(assertPropertyId("p".repeat(PROPERTY_ID_MAX_LENGTH))).toHaveLength(PROPERTY_ID_MAX_LENGTH);
    expectBadRequest(() => assertPropertyId("p".repeat(PROPERTY_ID_MAX_LENGTH + 1)), /at most 255/);
  });

  test.each([
    ["undefined", undefined],
    ["null", null],
    ["empty", ""],
    ["blank", "   "],
    ["a number", 42],
    ["an object", { id: "property-1" }],
  ])("rejects %s", (_label, propertyId) => {
    expectBadRequest(() => assertPropertyId(propertyId), /property_id/);
  });

  test.each(CONTROL_CHARACTERS)("rejects a property id containing the control character %j", (character) => {
    expectBadRequest(() => assertPropertyId(`property${character}1`), /property_id contains invalid characters/);
  });
});
