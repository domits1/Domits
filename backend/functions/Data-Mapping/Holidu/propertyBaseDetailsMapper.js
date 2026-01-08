export const toHolidu = (propertyBaseDetails) => {
  return {
    property_id: propertyBaseDetails.id,
    owner_id: propertyBaseDetails.hostId,
    name: propertyBaseDetails.title,
    tagline: propertyBaseDetails.subtitle,
    description_text: propertyBaseDetails.description,
    registration_code: propertyBaseDetails.registrationNumber,
    listing_status: propertyBaseDetails.status,
    created_timestamp: propertyBaseDetails.createdAt,
    modified_timestamp: propertyBaseDetails.updatedAt,
  };
};

export const fromHolidu = (holiduPayload) => {
  return {
    id: holiduPayload.property_id,
    hostId: holiduPayload.owner_id,
    title: holiduPayload.name,
    subtitle: holiduPayload.tagline,
    description: holiduPayload.description_text,
    registrationNumber: holiduPayload.registration_code,
    status: holiduPayload.listing_status,
    createdAt: holiduPayload.created_timestamp,
    updatedAt: holiduPayload.modified_timestamp,
  };
};

// Maps a full property payload (as returned by PropertyService) into a Holidu-friendly shape.
export const toHoliduFull = (fullPropertyPayload) => {
  if (!fullPropertyPayload || !fullPropertyPayload.property) {
    return fullPropertyPayload;
  }

  const toIsoOrNull = (epochMs) => (typeof epochMs === "number" ? new Date(epochMs).toISOString() : null);

  const base = toHolidu(fullPropertyPayload.property);

  return {
    property: base,
    location: fullPropertyPayload.location
      ? {
          country: fullPropertyPayload.location.country,
          city: fullPropertyPayload.location.city,
        }
      : null,
    images:
      fullPropertyPayload.images?.map((image) => ({
        key: image.key,
      })) ?? [],
    amenities:
      fullPropertyPayload.amenities?.map((amenity) => ({
        amenity_id: amenity.amenityId,
      })) ?? [],
    availability:
      fullPropertyPayload.availability?.map((slot) => ({
        available_from: toIsoOrNull(slot.availableStartDate),
        available_until: toIsoOrNull(slot.availableEndDate),
      })) ?? [],
    availability_restrictions:
      fullPropertyPayload.availabilityRestrictions?.map((restriction) => ({
        restriction: restriction.restriction,
        value: restriction.value,
      })) ?? [],
    check_in: fullPropertyPayload.checkIn?.checkIn
      ? {
          from: fullPropertyPayload.checkIn.checkIn.from,
          to: fullPropertyPayload.checkIn.checkIn.till,
        }
      : null,
    check_out: fullPropertyPayload.checkIn?.checkOut
      ? {
          from: fullPropertyPayload.checkIn.checkOut.from,
          to: fullPropertyPayload.checkIn.checkOut.till,
        }
      : null,
    pricing: fullPropertyPayload.pricing
      ? {
          nightly_rate: fullPropertyPayload.pricing.roomRate,
          cleaning_fee: fullPropertyPayload.pricing.cleaning,
        }
      : null,
    rules:
      fullPropertyPayload.rules?.map((rule) => ({
        rule: rule.rule,
        value: rule.value,
      })) ?? [],
    property_type: fullPropertyPayload.propertyType
      ? {
          type: fullPropertyPayload.propertyType.property_type,
          space_type: fullPropertyPayload.propertyType.spaceType,
        }
      : null,
    technical_details: fullPropertyPayload.technicalDetails ?? null,
    general_details:
      fullPropertyPayload.generalDetails?.map((detail) => ({
        name: detail.detail,
        value: detail.value,
      })) ?? [],
    test_status: fullPropertyPayload.propertyTestStatus ?? null,
  };
};
