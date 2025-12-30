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
