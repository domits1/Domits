import { getOwnerApiUrl } from "./ownerApiConfig";

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe("getOwnerApiUrl", () => {
  test("returns the configured URL, trimmed", () => {
    process.env.REACT_APP_PROPERTY_OWNERS_API_URL = "  https://owners.example.test/default/property-owners  ";

    expect(getOwnerApiUrl()).toBe("https://owners.example.test/default/property-owners");
  });

  test.each([
    ["missing", undefined],
    ["empty", ""],
    ["blank", "   "],
  ])("throws a clear error when the variable is %s", (_label, value) => {
    if (value === undefined) {
      delete process.env.REACT_APP_PROPERTY_OWNERS_API_URL;
    } else {
      process.env.REACT_APP_PROPERTY_OWNERS_API_URL = value;
    }

    expect(() => getOwnerApiUrl()).toThrow(
      "REACT_APP_PROPERTY_OWNERS_API_URL is not set. Add the property-owners API URL to the environment."
    );
  });

  test.each([
    ["a relative path", "/property-owners"],
    ["plain http", "http://owners.example.test/default/property-owners"],
    ["another scheme", "ftp://owners.example.test"],
    ["not a URL", "property owners"],
  ])("throws when the variable is %s", (_label, value) => {
    process.env.REACT_APP_PROPERTY_OWNERS_API_URL = value;

    expect(() => getOwnerApiUrl()).toThrow("REACT_APP_PROPERTY_OWNERS_API_URL must be an absolute https URL.");
  });
});
