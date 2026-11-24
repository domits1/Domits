const { validateFinancialDataQuery } = require("../../functions/property-owners/business/validation/financialDataValidator.js");
const { BadRequestException } = require("../../functions/property-owners/util/exception/badRequestException.js");

const OWNER_ID = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";
const VALID_QUERY = Object.freeze({
  action: "financial-data",
  id: OWNER_ID,
  period_start_ms: "1793491200000",
  period_end_ms: "1796083200000",
});

describe("validateFinancialDataQuery", () => {
  test("parses the requested owner, half-open period and default pagination", () => {
    expect(validateFinancialDataQuery(VALID_QUERY)).toEqual({
      ownerId: OWNER_ID,
      periodStartMs: 1793491200000,
      periodEndMs: 1796083200000,
      limit: 100,
      offset: 0,
    });
  });

  test("accepts an explicit page size and offset", () => {
    expect(validateFinancialDataQuery({ ...VALID_QUERY, limit: "250", offset: "500" })).toEqual({
      ownerId: OWNER_ID,
      periodStartMs: 1793491200000,
      periodEndMs: 1796083200000,
      limit: 250,
      offset: 500,
    });
  });

  test.each([
    ["missing action", { ...VALID_QUERY, action: undefined }],
    ["wrong action", { ...VALID_QUERY, action: "generate" }],
    ["missing owner id", { ...VALID_QUERY, id: undefined }],
    ["invalid owner id", { ...VALID_QUERY, id: "owner-1" }],
    ["missing period start", { ...VALID_QUERY, period_start_ms: undefined }],
    ["missing period end", { ...VALID_QUERY, period_end_ms: undefined }],
    ["negative period start", { ...VALID_QUERY, period_start_ms: "-1" }],
    ["non-numeric period start", { ...VALID_QUERY, period_start_ms: "yesterday" }],
    ["non-integer period end", { ...VALID_QUERY, period_end_ms: "1796083200.5" }],
    ["unsafe period end", { ...VALID_QUERY, period_end_ms: "9007199254740992" }],
    ["empty period", { ...VALID_QUERY, period_end_ms: "1793491200000" }],
    ["reversed period", { ...VALID_QUERY, period_start_ms: "1796083200000", period_end_ms: "1793491200000" }],
    ["zero page size", { ...VALID_QUERY, limit: "0" }],
    ["too large page size", { ...VALID_QUERY, limit: "501" }],
    ["negative offset", { ...VALID_QUERY, offset: "-1" }],
    ["too large offset", { ...VALID_QUERY, offset: "1000001" }],
    ["unknown parameter", { ...VALID_QUERY, status: "Paid" }],
  ])("rejects %s with a 400", (_label, query) => {
    expect(() => validateFinancialDataQuery(query)).toThrow(BadRequestException);
  });

  test("rejects a missing query object", () => {
    expect(() => validateFinancialDataQuery(null)).toThrow(BadRequestException);
  });
});
