// Keep only properties that have ALL of the requested amenity ids.
// Amenity ids match amenity_and_category.id (and the ids in the frontend
// amenities store). Properties carry them under propertyAmenities[].amenityId.
export const filterByAmenities = (properties, amenityIds) => {
  const required = (Array.isArray(amenityIds) ? amenityIds : [])
    .map((id) => String(id).trim())
    .filter(Boolean);

  if (required.length === 0) return properties;

  return properties.filter((property) => {
    const owned = new Set(
      (property?.propertyAmenities ?? []).map((amenity) => String(amenity?.amenityId).trim())
    );
    return required.every((id) => owned.has(id));
  });
};
