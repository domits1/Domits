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
    expect(calculateDirectBookingCommission(101, 0.049)).toBe(5);
  });

  test("uses the correct default volume tiers", () => {
    expect(getDirectBookingPricingTier(249_999_00).rate).toBe(0.049);
    expect(getDirectBookingPricingTier(500_000_00).rate).toBe(0.045);
    expect(getDirectBookingPricingTier(1_500_000_00).rate).toBe(0.039);
    expect(getDirectBookingPricingTier(5_000_000_00).enterprise).toBe(true);
  });
});
