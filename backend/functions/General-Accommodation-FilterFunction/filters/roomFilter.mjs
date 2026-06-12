const DETAIL_KEYS = {
  bedrooms: "Bedrooms",
  beds: "Beds",
  bathrooms: "Bathrooms",
};

const parseMinimum = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
};

const getDetailValue = (property, detailName) => {
  const details = property?.propertyGeneralDetails;
  if (!Array.isArray(details)) return null;

  const match = details.find((item) => item?.detail === detailName);
  const value = Number.parseInt(match?.value, 10);
  return Number.isNaN(value) ? null : value;
};

export const filterByRoomsAndBeds = (properties, { bedrooms, beds, bathrooms }) => {
  const minimums = {
    bedrooms: parseMinimum(bedrooms),
    beds: parseMinimum(beds),
    bathrooms: parseMinimum(bathrooms),
  };

  const activeFilters = Object.entries(minimums).filter(([, value]) => value !== null);
  if (activeFilters.length === 0) return properties;

  return properties.filter((property) => {
    return activeFilters.every(([key, minimum]) => {
      const value = getDetailValue(property, DETAIL_KEYS[key]);
      if (value === null) return true;
      return value >= minimum;
    });
  });
};
