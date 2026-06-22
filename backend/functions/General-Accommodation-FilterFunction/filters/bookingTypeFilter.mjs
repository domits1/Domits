const BOOKING_TYPES = new Set(["direct", "inquiry"]);

export const filterByBookingType = (properties, bookingType) => {
  const normalizedBookingType = bookingType?.trim().toLowerCase();
  if (!BOOKING_TYPES.has(normalizedBookingType)) return properties;

  return properties.filter((property) => {
    const propertyBookingType = property?.property?.bookingType?.trim().toLowerCase() || "direct";
    return propertyBookingType === normalizedBookingType;
  });
};
