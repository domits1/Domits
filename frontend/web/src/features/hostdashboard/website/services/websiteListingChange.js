import { resolveAccommodationImageKey } from "../../../../utils/accommodationImage";

const SITE_STATUS_PUBLISHED = "PUBLISHED";
const AMENITY_ID_FIELDS = Object.freeze(["amenityId", "amenity_id", "id", "amenity"]);

const cleanText = (value) =>
  (value === null || value === undefined ? "" : String(value)).replaceAll(/\s+/g, " ").trim();
const toList = (value) => (Array.isArray(value) ? value : []);
const readNumber = (value) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

const firstFilledField = (entry, fields) => {
  if (!entry || typeof entry !== "object") {
    return "";
  }
  for (const field of fields) {
    const value = cleanText(entry[field]);
    if (value) {
      return value;
    }
  }
  return "";
};

const toSortedPairs = (entries, keyField, valueField) =>
  toList(entries)
    .map((entry) => `${cleanText(entry?.[keyField])}=${cleanText(entry?.[valueField])}`)
    .filter((pair) => pair !== "=")
    .sort((left, right) => left.localeCompare(right));

export const buildListingDigest = (propertyDetails) => {
  const property = propertyDetails?.property || {};
  const pricing = propertyDetails?.pricing || {};
  const location = propertyDetails?.location || {};
  const checkIn = propertyDetails?.checkIn || {};
  const propertyType = propertyDetails?.propertyType || {};

  return {
    propertyType: cleanText(propertyType.spaceType || propertyType.property_type),
    title: cleanText(property.title),
    subtitle: cleanText(property.subtitle),
    description: cleanText(property.description),
    images: toList(propertyDetails?.images)
      .map((image) => resolveAccommodationImageKey(image))
      .filter(Boolean),
    amenities: toList(propertyDetails?.amenities)
      .map((amenity) => firstFilledField(amenity, AMENITY_ID_FIELDS))
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right)),
    generalDetails: toSortedPairs(propertyDetails?.generalDetails, "detail", "value"),
    rules: toSortedPairs(propertyDetails?.rules, "rule", "value"),
    availabilityRestrictions: toSortedPairs(propertyDetails?.availabilityRestrictions, "restriction", "value"),
    checkIn: [
      cleanText(checkIn.checkIn?.from),
      cleanText(checkIn.checkIn?.till),
      cleanText(checkIn.checkOut?.from),
      cleanText(checkIn.checkOut?.till),
    ],
    pricing: { roomRate: readNumber(pricing.roomRate ?? pricing.roomrate) },
    location: [cleanText(location.city), cleanText(location.country)],
  };
};

const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const hasListingChangedSincePublish = (publishedSnapshot, currentDetails) => {
  if (!isObject(publishedSnapshot) || Object.keys(publishedSnapshot).length === 0 || !isObject(currentDetails)) {
    return false;
  }
  return JSON.stringify(buildListingDigest(publishedSnapshot)) !== JSON.stringify(buildListingDigest(currentDetails));
};

export const formatPublishedAtLabel = (publishedAt) => {
  const parsedValue = Number(publishedAt);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return "";
  }
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(parsedValue));
  } catch {
    return "";
  }
};

export const resolveLiveSiteStaleness = (siteSummary, currentDetails) => {
  const site = siteSummary?.site;
  if (!isObject(site) || site.status !== SITE_STATUS_PUBLISHED) {
    return { isStale: false, publishedAt: null };
  }

  return {
    isStale: hasListingChangedSincePublish(site.publishedPropertySnapshot, currentDetails),
    publishedAt:
      Number.isFinite(Number(site.publishedAt)) && Number(site.publishedAt) > 0 ? Number(site.publishedAt) : null,
  };
};
