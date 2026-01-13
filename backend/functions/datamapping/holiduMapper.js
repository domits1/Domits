// Maps a full property payload (as returned by PropertyService) into a Holidu-friendly shape.
export const toHoliduFull = (fullPropertyPayload) => {
  if (!fullPropertyPayload || !fullPropertyPayload.property) {
    return fullPropertyPayload;
  }

  const property = fullPropertyPayload.property;

  const base = {
    providerApartmentGroupId: property.id,
    name: property.title,
    apartmentAddress: {
      countryCode: fullPropertyPayload.location?.country || null,
      city: fullPropertyPayload.location?.city || null,
      street: fullPropertyPayload.location?.street || null,
      zipCode: fullPropertyPayload.location?.zipCode || null,
    },
    guestCapacityRules: {
      //Function doesn't exist yet
      standardCapacity: fullPropertyPayload.generalDetails?.find((d) => d.detail === "Guests")?.value ?? null,
      adultsOnly: false,
      additionalChildren: null,
      maxBabies: null,
    },
    numberOfBedrooms: fullPropertyPayload.generalDetails?.find((d) => d.detail === "Bedrooms")?.value ?? null,
    numberOfBathrooms: fullPropertyPayload.generalDetails?.find((d) => d.detail === "Bathrooms")?.value ?? null,
    apartmentType: fullPropertyPayload.propertyType?.property_type || null,
    checkInCheckOutTimes: {
      checkIn: fullPropertyPayload.checkIn?.checkIn
        ? {
            checkInFrom: fullPropertyPayload.checkIn.checkIn.from,
            checkInTo: fullPropertyPayload.checkIn.checkIn.till,
          }
        : null,
      checkOutUntil: fullPropertyPayload.checkIn?.checkOut?.till || null,
    },
    license: property.registrationNumber || null,
    isTestApartment: fullPropertyPayload.propertyTestStatus?.isTest || false,
    pricing: fullPropertyPayload.pricing
      ? {
          nightly_rate: fullPropertyPayload.pricing.roomRate,
          cleaning_fee: fullPropertyPayload.pricing.cleaning,
        }
      : null,
    rules:
      fullPropertyPayload.rules?.map((r) => ({
        rule: r.rule,
        value: r.value,
      })) ?? [],
    technicalDetails: fullPropertyPayload.technicalDetails || null,
  };

  const descriptions = [
    {
      language: "HARDCODED_LANGUAGE", // Default; This should be dynamic in the future.
      title: property.title,
      description: property.description,
    },
  ];

  const images =
    fullPropertyPayload.images?.map((img, index) => ({
      url: img.key,
      position: index + 1,
    })) ?? [];

  const facilities = // amenities are not stored properly for external channels. This needs a refactoring.
    fullPropertyPayload.amenities?.map((a) => ({
      type: a.amenityId,
      maxAmount: null,
      privateUsage: false,
      additionalFeesApply: false,
      room: null,
      availableTime: fullPropertyPayload.availability
        ? {
            availableFrom: {
              pointInMonth: "HARDCODED_POINT_IN_TIME",
              month: "HARDCODED_MONTH",
            },
            availableTo: {
              pointInMonth: "HARDCODED_POINT_IN_TIME",
              month: "HARDCODED_MONTH",
            },
          }
        : null,
    })) ?? [];

  return {
    property: base,
    descriptions,
    images,
    facilities,
  };
};
