import { formatDateTime } from "./formatDateTime";

const NOON = Date.UTC(2026, 9, 8, 12, 0);
const UTC = { timeZone: "UTC" };

describe("formatDateTime", () => {
  it("formats the date and time, including the year", () => {
    expect(formatDateTime(NOON, "en", UTC)).toContain("2026");
  });

  it.each(["nl", "de", "es"])("formats differently in %s than in English", (language) => {
    const formatted = formatDateTime(NOON, language, UTC);

    expect(formatted).toContain("2026");
    expect(formatted).not.toBe(formatDateTime(NOON, "en", UTC));
  });

  it.each([null, undefined, "not a date", NaN])("returns an empty string for %j", (value) => {
    expect(formatDateTime(value, "en")).toBe("");
  });

  it("falls back to English for a language it cannot format", () => {
    expect(formatDateTime(NOON, "not a locale!!", UTC)).toBe(formatDateTime(NOON, "en", UTC));
  });
});
