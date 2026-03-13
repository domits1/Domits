const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const LISTING_SERVICE_FEE_RATE = 0.1;

export const getListingPricingBreakdown = (pricing = {}, nightsInput = 1) => {
  const roomRate = toNumber(pricing?.roomRate);
  const cleaningRate = toNumber(pricing?.cleaning);
  const normalizedNights = Math.max(1, toNumber(nightsInput));

  const roomSubtotal = roomRate * normalizedNights;
  const cleaningSubtotal = cleaningRate * normalizedNights;
  const serviceFee = (roomSubtotal + cleaningSubtotal) * LISTING_SERVICE_FEE_RATE;
  const total = roomSubtotal + cleaningSubtotal + serviceFee;
  const nightlyDisplayPrice = roomRate + roomRate * LISTING_SERVICE_FEE_RATE;

  return {
    roomRate,
    cleaningRate,
    nights: normalizedNights,
    roomSubtotal,
    cleaningSubtotal,
    serviceFee,
    total,
    nightlyDisplayPrice,
  };
};
