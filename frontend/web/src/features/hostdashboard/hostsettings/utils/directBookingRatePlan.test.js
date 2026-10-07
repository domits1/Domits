import {
  calculateDirectBookingCommission,
  getDirectBookingPricingTier,
} from "./directBookingRatePlan";

describe("direct booking rate plan", () => {
  test("calculates the standard 4.9% host fee in cents", () => {
    expect(calculateDirectBookingCommission(50_000)).toBe(2_450);
    expect(calculateDirectBookingCommission(200_000)).toBe(9_800);
  });

  test("rounds commission to whole cents", () => {
    expect(calculateDirectBookingCommission(110, 0.049)).toBe(5);
  });

  test("returns zero for an invalid commission rate", () => {
    expect(calculateDirectBookingCommission(10_000, Number.NaN)).toBe(0);
  });

  test("uses both sides of every default volume tier boundary", () => {
    expect(getDirectBookingPricingTier(24_999_999).rate).toBe(0.049);
    expect(getDirectBookingPricingTier(25_000_000).rate).toBe(0.045);

    expect(getDirectBookingPricingTier(99_999_999).rate).toBe(0.045);
    expect(getDirectBookingPricingTier(100_000_000).rate).toBe(0.039);

    expect(getDirectBookingPricingTier(499_999_999).rate).toBe(0.039);
    expect(getDirectBookingPricingTier(500_000_000).enterprise).toBe(true);
  });
});
