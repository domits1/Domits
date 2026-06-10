// Must match the frontend service fee applied to the displayed nightly price
// (see getListingPricingBreakdown / LISTING_SERVICE_FEE_RATE).
const SERVICE_FEE_RATE = 0.1;

export const filterByPrice = (properties, minPrice, maxPrice) => {
  const min = Number.parseFloat(minPrice || "0");
  const max = Number.parseFloat(maxPrice || "10000000");

  if (Number.isNaN(min) || Number.isNaN(max)) {
    console.warn("invalid price range skipping price filter.");
    return properties;
  }

  return properties.filter((p) => {
    const roomRate = p?.propertyPricing?.roomRate;
    if (typeof roomRate !== "number") return true;
    // Compare against the fee-inclusive nightly price shown on the card.
    const displayPrice = roomRate + roomRate * SERVICE_FEE_RATE;
    return displayPrice >= min && displayPrice <= max;
  });
};
