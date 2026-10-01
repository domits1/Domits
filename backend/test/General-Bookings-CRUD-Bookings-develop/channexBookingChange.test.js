import { describe, expect, it } from "@jest/globals";
import { bookingAvailabilityChange } from "../../functions/General-Bookings-CRUD-Bookings-develop/util/channexBookingChange.js";

const day = (iso) => Date.parse(`${iso}T00:00:00.000Z`);

describe("bookingAvailabilityChange", () => {
  it("covers arrival to the last night, not the checkout day", () => {
    expect(bookingAvailabilityChange("property-1", { arrivalMs: day("2026-11-01"), departureMs: day("2026-11-04") })).toEqual({
      domitsPropertyId: "property-1",
      changeTypes: ["availability"],
      dateFrom: "2026-11-01",
      dateTo: "2026-11-03",
      source: "BOOKING",
    });
  });

  it("a one-night stay starts and ends on the same date", () => {
    const change = bookingAvailabilityChange("property-1", { arrivalMs: day("2026-11-01"), departureMs: day("2026-11-02") });
    expect([change.dateFrom, change.dateTo]).toEqual(["2026-11-01", "2026-11-01"]);
  });

  it.each([
    ["departure before arrival", { arrivalMs: day("2026-11-03"), departureMs: day("2026-11-01") }],
    ["same day", { arrivalMs: day("2026-11-01"), departureMs: day("2026-11-01") }],
    ["missing dates", { arrivalMs: undefined, departureMs: undefined }],
    ["a stay without a whole night", { arrivalMs: 1000, departureMs: 2000 }],
  ])("returns null for %s", (_, stay) => {
    expect(bookingAvailabilityChange("property-1", stay)).toBeNull();
  });
});
