import {
  normalizePreferredMfa,
  formatDateOfBirth,
  validateDateOfBirth,
  formatBirthdateForStorage,
  formatBirthdateForDisplay,
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

  describe("formatDateOfBirth", () => {
    test.each([
      ["", ""],
      ["1", "1"],
      ["12", "12-"],
      ["123", "12-3"],
      ["1234", "12-34-"],
      ["12345", "12-34-5"],
      ["12345678", "12-34-5678"],
    ])("formatDateOfBirth(%p) → %p", (digits, expected) => {
      expect(formatDateOfBirth(digits)).toBe(expected);
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
