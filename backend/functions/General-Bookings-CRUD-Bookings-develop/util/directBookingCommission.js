export const DIRECT_BOOKING_COMMISSION_PERIOD_MS = 365 * 24 * 60 * 60 * 1000;
export const DIRECT_BOOKING_COMMISSION_TIERS = Object.freeze([
  Object.freeze({ maxRevenueCents: 24_999_999, rateBps: 490 }),
  Object.freeze({ maxRevenueCents: 99_999_999, rateBps: 450 }),
  Object.freeze({ maxRevenueCents: 499_999_999, rateBps: 390 }),
  Object.freeze({ maxRevenueCents: null, rateBps: null, enterprise: true }),
]);

export const getDirectBookingCommissionTier = (annualRevenueCents) => {
  const revenueCents = Math.max(0, Math.round(Number(annualRevenueCents) || 0));
  return DIRECT_BOOKING_COMMISSION_TIERS.find(
    (tier) => tier.maxRevenueCents === null || revenueCents <= tier.maxRevenueCents
  );
};

export const calculateDirectBookingCommissionCents = (commissionableAmountCents, rateBps) => {
  const amountCents = Math.max(0, Math.round(Number(commissionableAmountCents) || 0));
  const numericRateBps = Number(rateBps);
  if (!Number.isSafeInteger(amountCents) || !Number.isInteger(numericRateBps) || numericRateBps < 0) {
    throw new TypeError("A valid commissionable amount and rate are required.");
  }
  return Math.round((amountCents * numericRateBps) / 10_000);
};

export const resolveDirectBookingCommission = ({
  previousAnnualRevenueCents,
  commissionableAmountCents,
}) => {
  const previousRevenueCents = Math.max(0, Math.round(Number(previousAnnualRevenueCents) || 0));
  const reservationAmountCents = Math.round(Number(commissionableAmountCents));
  if (!Number.isSafeInteger(previousRevenueCents) || !Number.isSafeInteger(reservationAmountCents) || reservationAmountCents <= 0) {
    throw new TypeError("Valid annual revenue and commissionable reservation amounts are required.");
  }

  const annualRevenueCents = previousRevenueCents + reservationAmountCents;
  if (!Number.isSafeInteger(annualRevenueCents)) {
    throw new RangeError("Annual direct booking revenue exceeds the supported amount.");
  }

  const tier = getDirectBookingCommissionTier(annualRevenueCents);
  return {
    annualRevenueCents,
    tier,
    commissionAmountCents: tier.enterprise
      ? null
      : calculateDirectBookingCommissionCents(reservationAmountCents, tier.rateBps),
  };
};
