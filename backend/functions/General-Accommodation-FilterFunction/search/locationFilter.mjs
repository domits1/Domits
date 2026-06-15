export const filterByLocation = (properties, country, city) => {
  const cityNormalized = city?.trim().toLowerCase();
  const countryNormalized = country?.trim().toLowerCase();

  return properties.filter((p) => {
    const propCity = p?.propertyLocation?.city?.trim().toLowerCase();
    const propCountry = p?.propertyLocation?.country?.trim().toLowerCase();

    const cityMatch = cityNormalized ? propCity === cityNormalized : true;
    const countryMatch = countryNormalized ? propCountry === countryNormalized : true;

    return cityMatch && countryMatch;
  });
};
