// Must match the frontend service fee applied to the displayed nightly price
// (see getListingPricingBreakdown / LISTING_SERVICE_FEE_RATE).
export const SERVICE_FEE_RATE = 0.1;

// Fee-inclusive nightly price shown on the card; null when there's no valid rate.
export const getNightlyDisplayPrice = (property) => {
  const roomRate = property?.propertyPricing?.roomRate;
  if (typeof roomRate !== "number") return null;
  return roomRate + roomRate * SERVICE_FEE_RATE;
};

export const filterByPrice = (properties, minPrice, maxPrice) => {
  const min = Number.parseFloat(minPrice || "0");
  const max = Number.parseFloat(maxPrice || "10000000");

  if (Number.isNaN(min) || Number.isNaN(max)) {
    console.warn("invalid price range skipping price filter.");
    return properties;
  }

  return properties.filter((p) => {
    const displayPrice = getNightlyDisplayPrice(p);
    if (displayPrice === null) return true;
    return displayPrice >= min && displayPrice <= max;
  });
};
