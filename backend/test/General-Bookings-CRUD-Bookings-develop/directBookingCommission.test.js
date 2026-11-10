import { describe, expect, it } from "@jest/globals";
import {
  calculateDirectBookingCommission,
  DIRECT_BOOKING_COMMISSION_TIERS,
} from "../../functions/General-Bookings-CRUD-Bookings-develop/util/directBookingCommission.js";

describe("direct booking annual commission tiers", () => {
  it("keeps the configured rates and upper boundaries in cents", () => {
    expect(DIRECT_BOOKING_COMMISSION_TIERS).toEqual([
      { maxRevenueCents: 24_999_999, rate: 0.049 },
      { maxRevenueCents: 99_999_999, rate: 0.045 },
      { maxRevenueCents: 499_999_999, rate: 0.039 },
      { maxRevenueCents: null, rate: null, enterprise: true },
    ]);
  });

  it("applies 4.9% when annual revenue including the booking remains below €250,000", () => {
    expect(calculateDirectBookingCommission({
      annualRevenueBeforeBookingCents: 24_989_999,
      commissionableAccommodationCents: 10_000,
    })).toEqual({
      rate: 0.049,
      commissionAmountCents: 490,
      annualRevenueCents: 24_999_999,
    });
  });

  it("switches to 4.5% on the booking that reaches €250,000", () => {
    expect(calculateDirectBookingCommission({
      annualRevenueBeforeBookingCents: 24_999_999,
      commissionableAccommodationCents: 1,
    })).toEqual({
      rate: 0.045,
      commissionAmountCents: 0,
      annualRevenueCents: 25_000_000,
    });
  });

  it("switches to 3.9% on the booking that reaches €1,000,000", () => {
    expect(calculateDirectBookingCommission({
      annualRevenueBeforeBookingCents: 99_999_999,
      commissionableAccommodationCents: 1,
    })).toEqual({
      rate: 0.039,
      commissionAmountCents: 0,
      annualRevenueCents: 100_000_000,
    });
  });

  it("uses 3.9% through €4,999,999.99", () => {
    expect(calculateDirectBookingCommission({
      annualRevenueBeforeBookingCents: 499_989_999,
      commissionableAccommodationCents: 10_000,
    })).toEqual({
      rate: 0.039,
      commissionAmountCents: 390,
      annualRevenueCents: 499_999_999,
    });
  });

  it("requires an Enterprise rate at €5,000,000 and above", () => {
    expect(() => calculateDirectBookingCommission({
      annualRevenueBeforeBookingCents: 499_999_999,
      commissionableAccommodationCents: 1,
    })).toThrow(expect.objectContaining({
      code: "DIRECT_BOOKING_ENTERPRISE_RATE_REQUIRED",
      statusCode: 409,
    }));
  });

  it("rejects invalid commissionable amounts", () => {
    expect(() => calculateDirectBookingCommission({
      annualRevenueBeforeBookingCents: 0,
      commissionableAccommodationCents: -1,
    })).toThrow("commissionableAccommodationCents must be a non-negative safe integer number of cents.");
  });
});
