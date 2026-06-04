export const filterByPrice = (properties, minPrice, maxPrice) => {
  const min = Number.parseFloat(minPrice || "0");
  const max = Number.parseFloat(maxPrice || "10000000");

  if (Number.isNaN(min) || Number.isNaN(max)) {
    console.warn("invalid price range skipping price filter.");
    return properties;
  }

  return properties.filter((p) => {
    const price = p?.propertyPricing?.roomRate;
    if (typeof price !== "number") return true;
    return price >= min && price <= max;
  });
};
