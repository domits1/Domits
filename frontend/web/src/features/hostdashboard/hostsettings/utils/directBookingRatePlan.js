export const DIRECT_BOOKING_STANDARD_RATE = 0.049;

export const DIRECT_BOOKING_PRICING_TIERS = [
  { maxRevenueCents: 24_999_999, rate: 0.049 },
  { maxRevenueCents: 99_999_999, rate: 0.045 },
  { maxRevenueCents: 499_999_999, rate: 0.039 },
  { maxRevenueCents: null, rate: null, enterprise: true },
];

export const calculateDirectBookingCommission = (
  commissionableAmountCents,
  rate = DIRECT_BOOKING_STANDARD_RATE
) => {
  const amountCents = Math.max(0, Math.round(Number(commissionableAmountCents) || 0));
  const numericRate = Number(rate);

  if (!Number.isFinite(numericRate) || numericRate < 0) {
    return 0;
  }

  return Math.round(amountCents * numericRate);
};

export const getDirectBookingPricingTier = (annualRevenueCents) => {
  const revenueCents = Math.max(0, Math.round(Number(annualRevenueCents) || 0));

  return (
    DIRECT_BOOKING_PRICING_TIERS.find(
      (tier) => tier.maxRevenueCents === null || revenueCents <= tier.maxRevenueCents
    ) || DIRECT_BOOKING_PRICING_TIERS[0]
  );
};
