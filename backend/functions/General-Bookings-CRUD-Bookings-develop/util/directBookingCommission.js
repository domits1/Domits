export const STANDALONE_SITE_BOOKING_SOURCE = "STANDALONE_SITE";

export const DIRECT_BOOKING_COMMISSION_TIERS = Object.freeze([
  { maxRevenueCents: 24_999_999, rate: 0.049 },
  { maxRevenueCents: 99_999_999, rate: 0.045 },
  { maxRevenueCents: 499_999_999, rate: 0.039 },
  { maxRevenueCents: null, rate: null, enterprise: true },
]);

const normalizeCents = (value, fieldName) => {
  const cents = Number(value);
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new TypeError(`${fieldName} must be a non-negative safe integer number of cents.`);
  }
  return cents;
};

export const calculateDirectBookingCommission = ({
  annualRevenueBeforeBookingCents,
  commissionableAccommodationCents,
}) => {
  const annualRevenueBeforeBooking = normalizeCents(
    annualRevenueBeforeBookingCents,
    "annualRevenueBeforeBookingCents"
  );
  const commissionableAmount = normalizeCents(
    commissionableAccommodationCents,
    "commissionableAccommodationCents"
  );
  if (commissionableAmount === 0) {
    throw new RangeError("A direct booking must have a positive commissionable accommodation amount.");
  }

  const annualRevenueCents = annualRevenueBeforeBooking + commissionableAmount;
  const tier = DIRECT_BOOKING_COMMISSION_TIERS.find(
    (candidate) =>
      candidate.maxRevenueCents === null || annualRevenueCents <= candidate.maxRevenueCents
  );

  if (!tier || tier.enterprise || !Number.isFinite(tier.rate)) {
    const error = new Error(
      "Annual direct booking revenue exceeds €4,999,999.99. A custom Enterprise commission rate is required."
    );
    error.code = "DIRECT_BOOKING_ENTERPRISE_RATE_REQUIRED";
    error.statusCode = 409;
    throw error;
  }

  return {
    rate: tier.rate,
    commissionAmountCents: Math.round(commissionableAmount * tier.rate),
    annualRevenueCents,
  };
};
