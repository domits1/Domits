export const filterByType = (properties, type) => {
  const typeNormalized = type?.trim().toLowerCase();
  if (!typeNormalized) return properties;

  return properties.filter((p) => {
    const propType = p?.propertyType?.property_type?.trim().toLowerCase();
    return propType === typeNormalized;
  });
};
