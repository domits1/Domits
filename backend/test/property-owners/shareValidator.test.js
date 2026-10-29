const {
  validateSetShares,
  MAX_SHARES_PER_REQUEST,
  TOTAL_BASIS_POINTS,
} = require("../../functions/property-owners/business/validation/shareValidator.js");
const { BadRequestException } = require("../../functions/property-owners/util/exception/badRequestException.js");

const DAY_MS = 86400000;
const TODAY = Date.UTC(2026, 9, 22);
const EFFECTIVE_FROM_LIMIT = TODAY + 1826 * DAY_MS;
const OWNER_A = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";
const OWNER_B = "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f";

const share = (owner_id, ownership_basis_points) => ({ owner_id, ownership_basis_points });

const validBody = (overrides = {}) => ({
  property_id: "property-1",
  effective_from: TODAY,
  shares: [share(OWNER_A, 6000), share(OWNER_B, 4000)],
  ...overrides,
});

const expectRejected = (body, message) => {
  let thrown;
  try {
    validateSetShares(body, TODAY);
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(BadRequestException);
  expect(thrown.statusCode).toBe(400);
  expect(thrown.message).toBe(message);
};

const ownersFor = (count) =>
  Array.from({ length: count }, (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`);

const evenShares = (count) => {
  const owners = ownersFor(count);
  const base = Math.floor(TOTAL_BASIS_POINTS / count);
  return owners.map((owner, index) =>
    share(owner, index === 0 ? TOTAL_BASIS_POINTS - base * (count - 1) : base)
  );
};

describe("validateSetShares accepts", () => {
  test("two owners with 6000 and 4000, returning exactly the normalised fields", () => {
    expect(validateSetShares(validBody(), TODAY)).toStrictEqual({
      propertyId: "property-1",
      effectiveFrom: TODAY,
      shares: [share(OWNER_A, 6000), share(OWNER_B, 4000)],
    });
  });

  test("a single owner with 10000", () => {
    expect(validateSetShares(validBody({ shares: [share(OWNER_A, 10000)] }), TODAY).shares).toStrictEqual([
      share(OWNER_A, 10000),
    ]);
  });

  test("an empty list, meaning no owners from effective_from", () => {
    expect(validateSetShares(validBody({ shares: [] }), TODAY)).toStrictEqual({
      propertyId: "property-1",
      effectiveFrom: TODAY,
      shares: [],
    });
  });

  test("an effective_from equal to today", () => {
    expect(validateSetShares(validBody({ effective_from: TODAY }), TODAY).effectiveFrom).toBe(TODAY);
  });

  test("an effective_from exactly 5 years after today", () => {
    expect(validateSetShares(validBody({ effective_from: EFFECTIVE_FROM_LIMIT }), TODAY).effectiveFrom).toBe(
      EFFECTIVE_FROM_LIMIT
    );
  });

  test("the maximum number of shares", () => {
    const shares = evenShares(MAX_SHARES_PER_REQUEST);

    expect(validateSetShares(validBody({ shares }), TODAY).shares).toHaveLength(MAX_SHARES_PER_REQUEST);
  });

  test("the property id trimmed, as assertPropertyId returns it", () => {
    expect(validateSetShares(validBody({ property_id: "  property-1  " }), TODAY).propertyId).toBe("property-1");
  });

  test("uppercase owner ids returned lowercase", () => {
    const result = validateSetShares(
      validBody({ shares: [share(OWNER_A.toUpperCase(), 6000), share(OWNER_B, 4000)] }),
      TODAY
    );

    expect(result.shares[0].owner_id).toBe(OWNER_A);
  });

  test("entries returned as new objects without extra references to the body", () => {
    const body = validBody();

    const result = validateSetShares(body, TODAY);

    expect(result.shares[0]).not.toBe(body.shares[0]);
    expect(result.shares).not.toBe(body.shares);
  });
});

describe("validateSetShares rejects the body", () => {
  test.each([
    ["null", null],
    ["an array", []],
    ["a string", "body"],
    ["a number", 42],
  ])("that is %s", (_label, body) => {
    expectRejected(body, "Request body must be a JSON object.");
  });

  test("with an unknown field", () => {
    expectRejected(validBody({ host_id: "host-2" }), "Unknown fields: host_id.");
  });

  test.each(["property_id", "effective_from", "shares"])("without %s", (field) => {
    const body = validBody();
    delete body[field];

    expectRejected(body, `Missing fields: ${field}.`);
  });
});

describe("validateSetShares rejects property_id", () => {
  test.each([
    [null, "property_id is required."],
    ["", "property_id is required."],
    [42, "property_id must be a string."],
    ["x".repeat(256), "property_id must be at most 255 characters."],
  ])("%p with the assertPropertyId message", (propertyId, message) => {
    expectRejected(validBody({ property_id: propertyId }), message);
  });
});

describe("validateSetShares rejects effective_from", () => {
  test.each([
    ["a string", String(TODAY)],
    ["null", null],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["a fraction", TODAY + 0.5],
    ["an unsafe integer", Number.MAX_SAFE_INTEGER + 1],
  ])("that is %s", (_label, effectiveFrom) => {
    expectRejected(validBody({ effective_from: effectiveFrom }), "effective_from must be an integer in epoch milliseconds.");
  });

  test.each([
    ["one millisecond after midnight", TODAY + 1],
    ["midday", TODAY + DAY_MS / 2],
  ])("that is %s", (_label, effectiveFrom) => {
    expectRejected(validBody({ effective_from: effectiveFrom }), "effective_from must be a UTC midnight.");
  });

  test.each([
    ["yesterday", TODAY - DAY_MS],
    ["the epoch", 0],
    ["a negative midnight", -DAY_MS],
  ])("in the past: %s", (_label, effectiveFrom) => {
    expectRejected(validBody({ effective_from: effectiveFrom }), "effective_from cannot be before today.");
  });

  test.each([
    ["one day after the limit", EFFECTIVE_FROM_LIMIT + DAY_MS],
    ["far in the future", Date.UTC(2126, 0, 1)],
  ])("more than 5 years after today: %s", (_label, effectiveFrom) => {
    expectRejected(
      validBody({ effective_from: effectiveFrom }),
      "effective_from cannot be more than 5 years after today."
    );
  });
});

describe("validateSetShares rejects shares", () => {
  test.each([
    ["null", null],
    ["an object", {}],
    ["a string", "shares"],
  ])("that is %s", (_label, shares) => {
    expectRejected(validBody({ shares }), "shares must be an array.");
  });

  test("with more than the maximum number of entries", () => {
    expectRejected(
      validBody({ shares: evenShares(MAX_SHARES_PER_REQUEST + 1) }),
      `shares must contain at most ${MAX_SHARES_PER_REQUEST} entries.`
    );
  });

  test.each([
    ["null", null],
    ["an array", [OWNER_A, 10000]],
    ["a string", OWNER_A],
  ])("with an entry that is %s", (_label, entry) => {
    expectRejected(validBody({ shares: [entry] }), "Each share must be an object.");
  });

  test.each([
    ["an extra field", { ...share(OWNER_A, 10000), effective_to: null }],
    ["no owner_id", { ownership_basis_points: 10000 }],
    ["no ownership_basis_points", { owner_id: OWNER_A }],
  ])("with an entry that has %s", (_label, entry) => {
    expectRejected(validBody({ shares: [entry] }), "Each share must contain exactly owner_id and ownership_basis_points.");
  });

  test.each([null, "", "owner-1", `${OWNER_A}x`, 42])("with owner_id %p", (ownerId) => {
    expectRejected(validBody({ shares: [share(ownerId, 10000)] }), "A valid owner id is required.");
  });

  test.each([
    ["0", 0],
    ["10001", 10001],
    ["negative", -1],
    ["a fraction", 1.5],
    ["a numeric string", "5000"],
    ["null", null],
    ["NaN", Number.NaN],
  ])("with ownership_basis_points %s", (_label, basisPoints) => {
    expectRejected(
      validBody({ shares: [share(OWNER_A, basisPoints)] }),
      "ownership_basis_points must be an integer from 1 to 10000."
    );
  });

  test.each([
    ["the same id twice", [share(OWNER_A, 5000), share(OWNER_A, 5000)]],
    ["ids that differ only in case", [share(OWNER_A, 5000), share(OWNER_A.toUpperCase(), 5000)]],
  ])("with %s", (_label, shares) => {
    expectRejected(validBody({ shares }), "Each owner can appear only once.");
  });

  test.each([
    ["9999", [share(OWNER_A, 5999), share(OWNER_B, 4000)]],
    ["10001", [share(OWNER_A, 6001), share(OWNER_B, 4000)]],
    ["a single owner below 10000", [share(OWNER_A, 9999)]],
  ])("that total %s", (_label, shares) => {
    expectRejected(validBody({ shares }), "Shares must add up to exactly 10000 basis points.");
  });
});
