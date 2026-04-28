import React from "react";
import amenitiesCatalog from "../../../../store/amenities";

const AMENITY_ICON_LOOKUP = new Map(
  amenitiesCatalog
    .map((amenityEntry) => [String(amenityEntry?.id || ""), amenityEntry?.icon])
    .filter(([amenityId, iconNode]) => Boolean(amenityId) && React.isValidElement(iconNode))
);

export const getAmenityIconNode = (amenityId, overrides = {}) => {
  const baseIcon = AMENITY_ICON_LOOKUP.get(String(amenityId || ""));
  if (!baseIcon) {
    return null;
  }

  const baseSx = baseIcon.props?.sx && typeof baseIcon.props.sx === "object" ? baseIcon.props.sx : {};
  const overrideSx = overrides.sx && typeof overrides.sx === "object" ? overrides.sx : {};

  return React.cloneElement(baseIcon, {
    ...overrides,
    sx: {
      ...baseSx,
      ...overrideSx,
    },
  });
};
