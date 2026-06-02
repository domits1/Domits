import React from "react";
import amenitiesCatalog from "../../../../store/amenities";

const resolveAmenityIconType = (iconElement) => {
  if (!React.isValidElement(iconElement)) {
    return null;
  }

  if (React.isValidElement(iconElement.props?.children)) {
    return iconElement.props.children.type || null;
  }

  return iconElement.type || null;
};

const ICON_TYPE_SIGNATURE_LOOKUP = new Map();

const getAmenityIconTypeSignature = (iconType) => {
  if (!iconType) {
    return "";
  }

  if (typeof iconType === "string") {
    return `html:${iconType}`;
  }

  if (!ICON_TYPE_SIGNATURE_LOOKUP.has(iconType)) {
    const readableName =
      iconType.displayName ||
      iconType.render?.displayName ||
      iconType.render?.name ||
      iconType.name ||
      `icon-${ICON_TYPE_SIGNATURE_LOOKUP.size + 1}`;

    ICON_TYPE_SIGNATURE_LOOKUP.set(iconType, readableName);
  }

  return ICON_TYPE_SIGNATURE_LOOKUP.get(iconType) || "";
};

const normalizeAmenityIconEntry = (amenityEntry) => ({
  id: String(amenityEntry?.id || "").trim(),
  label: String(amenityEntry?.amenity || "").trim(),
  category: String(amenityEntry?.category || "").trim(),
  icon: amenityEntry?.icon,
  iconSignature: getAmenityIconTypeSignature(resolveAmenityIconType(amenityEntry?.icon)),
});

const AMENITY_ICON_ENTRIES = Object.freeze(
  amenitiesCatalog
    .map(normalizeAmenityIconEntry)
    .filter((amenityEntry) => Boolean(amenityEntry.id) && React.isValidElement(amenityEntry.icon))
);

const AMENITY_ICON_LOOKUP = new Map(
  AMENITY_ICON_ENTRIES.map((amenityEntry) => [amenityEntry.id, amenityEntry.icon])
);

const AMENITY_ICON_SIGNATURE_BY_ID = new Map(
  AMENITY_ICON_ENTRIES.map((amenityEntry) => [amenityEntry.id, amenityEntry.iconSignature])
);

const AMENITY_ICON_OPTIONS = Object.freeze(
  Array.from(
    AMENITY_ICON_ENTRIES.reduce((dedupedEntries, amenityEntry) => {
      if (!amenityEntry.iconSignature || dedupedEntries.has(amenityEntry.iconSignature)) {
        return dedupedEntries;
      }

      dedupedEntries.set(amenityEntry.iconSignature, {
        id: amenityEntry.id,
        label: amenityEntry.label,
        category: amenityEntry.category,
        iconSignature: amenityEntry.iconSignature,
      });

      return dedupedEntries;
    }, new Map()).values()
  )
);

export const getAmenityIconOptions = () => AMENITY_ICON_OPTIONS;

export const getAmenityIconSignature = (amenityId) =>
  AMENITY_ICON_SIGNATURE_BY_ID.get(String(amenityId || "").trim()) || "";

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
