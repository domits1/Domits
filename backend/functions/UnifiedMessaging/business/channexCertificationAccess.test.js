const {
  isChannexCertificationUserAllowed,
  parseChannexCertificationUserIds,
} = require("./channexCertificationAccess.js");

describe("Channex certification access", () => {
  const originalEnv = process.env.CHANNEX_CERTIFICATION_USER_IDS;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.CHANNEX_CERTIFICATION_USER_IDS;
    } else {
      process.env.CHANNEX_CERTIFICATION_USER_IDS = originalEnv;
    }
  });

  test("parses comma, semicolon, and whitespace separated user IDs", () => {
    expect(parseChannexCertificationUserIds("user-1,user-2; user-3\nuser-4\t user-5")).toEqual([
      "user-1",
      "user-2",
      "user-3",
      "user-4",
      "user-5",
    ]);
  });

  test("ignores empty values and trims user IDs", () => {
    expect(parseChannexCertificationUserIds("  user-1, , ; user-2  ")).toEqual(["user-1", "user-2"]);
  });

  test("allows only user IDs present in CHANNEX_CERTIFICATION_USER_IDS", () => {
    process.env.CHANNEX_CERTIFICATION_USER_IDS = "allowed-1; allowed-2 allowed-3";

    expect(isChannexCertificationUserAllowed(" allowed-2 ")).toBe(true);
    expect(isChannexCertificationUserAllowed("not-allowed")).toBe(false);
    expect(isChannexCertificationUserAllowed(null)).toBe(false);
  });
});
