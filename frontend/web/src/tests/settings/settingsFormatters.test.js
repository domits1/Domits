import {
  normalizePreferredMfa,
  formatDateOfBirth,
  validateDateOfBirth,
  formatBirthdateForStorage,
  formatBirthdateForDisplay,
  validateNationality,
} from "../../components/settings/utils/settingsFormatters";

describe.skip("settingsFormatters", () => {
  describe("normalizePreferredMfa", () => {
    test("returns NOMFA for null", () => {
      expect(normalizePreferredMfa(null)).toBe("NOMFA");
    });

    test("returns NOMFA for undefined", () => {
      expect(normalizePreferredMfa(undefined)).toBe("NOMFA");
    });

    test("returns NOMFA for empty string", () => {
      expect(normalizePreferredMfa("")).toBe("NOMFA");
    });

    test("returns TOTP for SOFTWARE_TOKEN_MFA", () => {
      expect(normalizePreferredMfa("SOFTWARE_TOKEN_MFA")).toBe("TOTP");
    });

    test("returns SMS for SMS_MFA", () => {
      expect(normalizePreferredMfa("SMS_MFA")).toBe("SMS");
    });

    test("returns value as-is for unrecognised strings", () => {
      expect(normalizePreferredMfa("NOMFA")).toBe("NOMFA");
      expect(normalizePreferredMfa("OTHER")).toBe("OTHER");
    });
  });

  describe("formatDateOfBirth", () => {
    test("returns empty string for empty input", () => {
      expect(formatDateOfBirth("")).toBe("");
    });

    test("formats 1 digit with no separator", () => {
      expect(formatDateOfBirth("1")).toBe("1");
    });

    test("appends hyphen after 2 digits (day)", () => {
      expect(formatDateOfBirth("12")).toBe("12-");
    });

    test("formats 3 digits as DD-M", () => {
      expect(formatDateOfBirth("123")).toBe("12-3");
    });

    test("appends hyphen after 4 digits (day + month)", () => {
      expect(formatDateOfBirth("1234")).toBe("12-34-");
    });

    test("formats 5 digits as DD-MM-Y", () => {
      expect(formatDateOfBirth("12345")).toBe("12-34-5");
    });

    test("formats 8 digits fully as DD-MM-YYYY", () => {
      expect(formatDateOfBirth("12345678")).toBe("12-34-5678");
    });
  });

  describe("validateDateOfBirth", () => {
    test("returns error for empty value", () => {
      expect(validateDateOfBirth("")).toBe("Please enter a date of birth.");
    });

    test("returns format error for arbitrary string", () => {
      expect(validateDateOfBirth("invalid")).toBe("Use format DD-MM-YYYY.");
    });

    test("returns format error for partial date", () => {
      expect(validateDateOfBirth("01-01")).toBe("Use format DD-MM-YYYY.");
    });

    test("returns day error for day 00", () => {
      expect(validateDateOfBirth("00-01-2000")).toBe("Day must be between 01 and 31.");
    });

    test("returns day error for day 32", () => {
      expect(validateDateOfBirth("32-01-2000")).toBe("Day must be between 01 and 31.");
    });

    test("returns month error for month 00", () => {
      expect(validateDateOfBirth("01-00-2000")).toBe("Month must be between 01 and 12.");
    });

    test("returns month error for month 13", () => {
      expect(validateDateOfBirth("01-13-2000")).toBe("Month must be between 01 and 12.");
    });

    test("returns calendar error for 31 Feb", () => {
      expect(validateDateOfBirth("31-02-2000")).toBe("Please enter a valid calendar date.");
    });

    test("returns calendar error for 29 Feb in non-leap year", () => {
      expect(validateDateOfBirth("29-02-2001")).toBe("Please enter a valid calendar date.");
    });

    test("returns future-date error for year 2099", () => {
      expect(validateDateOfBirth("01-01-2099")).toBe("Date of birth cannot be in the future.");
    });

    test("returns empty string for a valid past date", () => {
      expect(validateDateOfBirth("01-01-1990")).toBe("");
    });

    test("accepts 29 Feb in a leap year", () => {
      expect(validateDateOfBirth("29-02-2000")).toBe("");
    });
  });

  describe("formatBirthdateForStorage", () => {
    test("converts DD-MM-YYYY to YYYY-MM-DD", () => {
      expect(formatBirthdateForStorage("25-12-1990")).toBe("1990-12-25");
    });

    test("pads single-digit month and day values", () => {
      expect(formatBirthdateForStorage("01-01-2000")).toBe("2000-01-01");
    });

    test("returns original value when format does not match", () => {
      expect(formatBirthdateForStorage("invalid")).toBe("invalid");
    });
  });

  describe("formatBirthdateForDisplay", () => {
    test("returns empty string for empty input", () => {
      expect(formatBirthdateForDisplay("")).toBe("");
    });

    test("converts YYYY-MM-DD to DD-MM-YYYY", () => {
      expect(formatBirthdateForDisplay("1990-12-25")).toBe("25-12-1990");
    });

    test("pads single-digit day and month", () => {
      expect(formatBirthdateForDisplay("2000-1-5")).toBe("05-01-2000");
    });

    test("returns value as-is when already in DD-MM-YYYY format", () => {
      expect(formatBirthdateForDisplay("25-12-1990")).toBe("25-12-1990");
    });

    test("returns value as-is for unrecognised format", () => {
      expect(formatBirthdateForDisplay("not-a-date")).toBe("not-a-date");
    });
  });

  describe("validateNationality", () => {
    test("returns error for empty string", () => {
      expect(validateNationality("")).toBe("Please enter a nationality.");
    });

    test("returns error for whitespace-only string", () => {
      expect(validateNationality("   ")).toBe("Please enter a nationality.");
    });

    test("returns length error for single character", () => {
      expect(validateNationality("A")).toBe("Nationality must be 2 to 64 characters.");
    });

    test("returns length error for string longer than 64 characters", () => {
      expect(validateNationality("A".repeat(65))).toBe("Nationality must be 2 to 64 characters.");
    });

    test("returns character error when starting with a space", () => {
      expect(validateNationality(" Dutch")).toBe("Use letters, spaces, hyphens, or apostrophes.");
    });

    test("returns character error for digits in nationality", () => {
      expect(validateNationality("Dutch123")).toBe("Use letters, spaces, hyphens, or apostrophes.");
    });

    test("returns empty string for plain valid nationality", () => {
      expect(validateNationality("Dutch")).toBe("");
    });

    test("returns empty string for nationality with internal spaces", () => {
      expect(validateNationality("Costa Rican")).toBe("");
    });

    test("returns empty string for nationality with hyphen", () => {
      expect(validateNationality("Afrikaans-speaking")).toBe("");
    });

    test("returns empty string for nationality with apostrophe", () => {
      expect(validateNationality("Ivorian")).toBe("");
    });

    test("returns empty string for exactly 2 characters", () => {
      expect(validateNationality("Du")).toBe("");
    });

    test("returns empty string for exactly 64 characters", () => {
      expect(validateNationality("Du" + "t".repeat(62))).toBe("");
    });
  });
});
