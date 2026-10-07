import {
  normalizePreferredMfa,
  parseDateOfBirth,
  formatDateOfBirthValue,
  validateDateOfBirth,
  formatBirthdateForStorage,
  formatBirthdateForDisplay,
  validateName,
  validateNationality,
} from "../../components/settings/utils/settingsFormatters";

describe("settingsFormatters", () => {
  describe("normalizePreferredMfa", () => {
    test.each([
      [null, "NOMFA"],
      [undefined, "NOMFA"],
      ["", "NOMFA"],
      ["SOFTWARE_TOKEN_MFA", "TOTP"],
      ["SMS_MFA", "SMS"],
      ["NOMFA", "NOMFA"],
      ["OTHER", "OTHER"],
    ])("normalizePreferredMfa(%p) → %p", (input, expected) => {
      expect(normalizePreferredMfa(input)).toBe(expected);
    });
  });

  describe("parseDateOfBirth", () => {
    test("returns null for an empty or malformed value", () => {
      expect(parseDateOfBirth("")).toBeNull();
      expect(parseDateOfBirth("2000-01-01")).toBeNull();
      expect(parseDateOfBirth(undefined)).toBeNull();
    });

    test("returns null for a calendar-invalid date", () => {
      expect(parseDateOfBirth("31-02-2000")).toBeNull();
    });

    test("returns a local Date matching the DD-MM-YYYY value", () => {
      const date = parseDateOfBirth("25-12-1990");
      expect(date.getFullYear()).toBe(1990);
      expect(date.getMonth()).toBe(11);
      expect(date.getDate()).toBe(25);
    });
  });

  describe("formatDateOfBirthValue", () => {
    test("returns an empty string for a falsy date", () => {
      expect(formatDateOfBirthValue(null)).toBe("");
    });

    test("formats a Date as DD-MM-YYYY", () => {
      expect(formatDateOfBirthValue(new Date(1990, 11, 25))).toBe("25-12-1990");
    });
  });

  describe("validateDateOfBirth", () => {
    test.each([
      ["", "Please enter a date of birth."],
      ["invalid", "Use format DD-MM-YYYY."],
      ["01-01", "Use format DD-MM-YYYY."],
      ["00-01-2000", "Day must be between 01 and 31."],
      ["32-01-2000", "Day must be between 01 and 31."],
      ["01-00-2000", "Month must be between 01 and 12."],
      ["01-13-2000", "Month must be between 01 and 12."],
      ["31-02-2000", "Please enter a valid calendar date."],
      ["29-02-2001", "Please enter a valid calendar date."],
      ["01-01-2099", "Date of birth cannot be in the future."],
      ["01-01-1990", ""],
      ["29-02-2000", ""],
    ])("validateDateOfBirth(%p) → %p", (value, expected) => {
      expect(validateDateOfBirth(value)).toBe(expected);
    });
  });

  describe("formatBirthdateForStorage", () => {
    test.each([
      ["25-12-1990", "1990-12-25"],
      ["01-01-2000", "2000-01-01"],
      ["invalid", "invalid"],
    ])("formatBirthdateForStorage(%p) → %p", (value, expected) => {
      expect(formatBirthdateForStorage(value)).toBe(expected);
    });
  });

  describe("formatBirthdateForDisplay", () => {
    test.each([
      ["", ""],
      ["1990-12-25", "25-12-1990"],
      ["2000-1-5", "05-01-2000"],
      ["25-12-1990", "25-12-1990"],
      ["not-a-date", "not-a-date"],
    ])("formatBirthdateForDisplay(%p) → %p", (value, expected) => {
      expect(formatBirthdateForDisplay(value)).toBe(expected);
    });
  });

  describe("validateName", () => {
    test("required field: rejects empty or whitespace-only values", () => {
      expect(validateName("", { fieldName: "first name" })).toBe("Please provide a valid first name.");
      expect(validateName("   ", { fieldName: "first name" })).toBe("Please provide a valid first name.");
    });

    test("optional field: allows empty values", () => {
      expect(validateName("", { fieldName: "last name", required: false })).toBe("");
      expect(validateName("   ", { fieldName: "last name", required: false })).toBe("");
    });

    test("rejects values over 50 characters", () => {
      expect(validateName("A".repeat(51), { fieldName: "first name" })).toBe(
        "Please keep the first name to 50 characters or fewer."
      );
    });

    test("rejects digits and symbols", () => {
      expect(validateName("John123", { fieldName: "first name" })).toBe(
        "Use letters, spaces, hyphens, or apostrophes."
      );
      expect(validateName("!!!", { fieldName: "first name" })).toBe(
        "Use letters, spaces, hyphens, or apostrophes."
      );
    });

    test("accepts letters, spaces, hyphens, and apostrophes", () => {
      expect(validateName("Mary-Jane O'Brien", { fieldName: "first name" })).toBe("");
    });
  });

  describe("validateNationality", () => {
    test.each([
      ["", "Please enter a nationality."],
      ["   ", "Please enter a nationality."],
      ["A", "Nationality must be 2 to 64 characters."],
      ["A".repeat(65), "Nationality must be 2 to 64 characters."],
      [" Dutch", "Use letters, spaces, hyphens, or apostrophes."],
      ["Dutch123", "Use letters, spaces, hyphens, or apostrophes."],
      ["Dutch", ""],
      ["Costa Rican", ""],
      ["Afrikaans-speaking", ""],
      ["Ivorian", ""],
      ["Du", ""],
      ["Du" + "t".repeat(62), ""],
    ])("validateNationality(%p) → %p", (value, expected) => {
      expect(validateNationality(value)).toBe(expected);
    });
  });
});
