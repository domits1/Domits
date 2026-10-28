import { describe, expect, test } from "@jest/globals";
import { isIsoDate, toAmount } from "../../functions/SiteMinder-Integration/util/otaValues.js";
import { buildAvailabilityNotif } from "../../functions/SiteMinder-Integration/util/availabilityMessage.js";
import { buildRestrictionsNotif } from "../../functions/SiteMinder-Integration/util/restrictionsMessage.js";
import { buildRatesNotif } from "../../functions/SiteMinder-Integration/util/ratesMessage.js";

describe("isIsoDate", () => {
  test.each(["2026-12-01", "2028-02-29", "2026-01-31"])("accepts %s", (value) => {
    expect(isIsoDate(value)).toBe(true);
  });

  test.each(["2026-13-45", "2026-02-30", "2027-02-29", "2026-00-10", "2026-1-01", "01-12-2026", "", undefined, 20261201])(
    "refuses %p",
    (value) => {
      expect(isIsoDate(value)).toBe(false);
    }
  );
});

describe("toAmount", () => {
  test.each([
    [1.005, "1.01"],
    [150, "150.00"],
    [120.5, "120.50"],
    [99.999, "100.00"],
    [0.1 + 0.2, "0.30"],
    [1.004, "1.00"],
  ])("formats %p as %s", (value, expected) => {
    expect(toAmount(value)).toBe(expected);
  });
});

describe("the message builders refuse a date that does not exist", () => {
  const head = { hotelCode: "PMSXTEST1", requestorId: "PMSXTEST", echoToken: "e1", now: new Date("2026-10-28T10:00:00.000Z") };
  const dates = { start: "2026-02-30", end: "2026-03-02" };

  test("availability", () => {
    expect(() => buildAvailabilityNotif({ ...head, items: [{ roomTypeCode: "DORM", ...dates, bookingLimit: 1 }] })).toThrow("real dates");
  });

  test("restrictions", () => {
    expect(() => buildRestrictionsNotif({ ...head, items: [{ roomTypeCode: "DORM", ratePlanCode: "BAR1", ...dates, stopSell: true }] })).toThrow("real dates");
  });

  test("rates", () => {
    expect(() =>
      buildRatesNotif({ ...head, items: [{ roomTypeCode: "DORM", ratePlanCode: "BAR1", ...dates, amount: 150, currency: "EUR" }] })
    ).toThrow("real dates");
  });

  test("rates round 1.005 up to 1.01", () => {
    const xml = buildRatesNotif({ ...head, items: [{ roomTypeCode: "DORM", ratePlanCode: "BAR1", start: "2026-12-01", end: "2026-12-01", amount: 1.005, currency: "EUR" }] });
    expect(xml).toContain('AmountAfterTax="1.01"');
  });
});
