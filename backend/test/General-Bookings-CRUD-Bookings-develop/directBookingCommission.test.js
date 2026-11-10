import { describe, expect, it } from "@jest/globals";
import {
  calculateDirectBookingCommissionCents,
  getDirectBookingCommissionTier,
  resolveDirectBookingCommission,
} from "../../functions/General-Bookings-CRUD-Bookings-develop/util/directBookingCommission.js";

describe("direct booking volume commission", () => {
  it("selects each rate at the exact annual revenue boundaries", () => {
    expect(getDirectBookingCommissionTier(24_999_999).rateBps).toBe(490);
    expect(getDirectBookingCommissionTier(25_000_000).rateBps).toBe(450);
    expect(getDirectBookingCommissionTier(99_999_999).rateBps).toBe(450);
    expect(getDirectBookingCommissionTier(100_000_000).rateBps).toBe(390);
    expect(getDirectBookingCommissionTier(499_999_999).rateBps).toBe(390);
    expect(getDirectBookingCommissionTier(500_000_000).enterprise).toBe(true);
  });

  it("calculates the commission in cents and rounds once", () => {
    expect(calculateDirectBookingCommissionCents(76_000, 490)).toBe(3_724);
    expect(calculateDirectBookingCommissionCents(76_000, 450)).toBe(3_420);
    expect(calculateDirectBookingCommissionCents(76_000, 390)).toBe(2_964);
  });

  it("includes the current reservation when choosing its commission rate", () => {
    const result = resolveDirectBookingCommission({
      previousAnnualRevenueCents: 24_990_000,
      commissionableAmountCents: 20_000,
    });
    expect(result.annualRevenueCents).toBe(25_010_000);
    expect(result.tier.rateBps).toBe(450);
    expect(result.commissionAmountCents).toBe(900);
  });

  it("marks the custom Enterprise tier without inventing a rate", () => {
    const result = resolveDirectBookingCommission({
      previousAnnualRevenueCents: 500_000_000,
      commissionableAmountCents: 1,
    });
    expect(result.tier.enterprise).toBe(true);
    expect(result.tier.rateBps).toBeNull();
    expect(result.commissionAmountCents).toBeNull();
  });
});
