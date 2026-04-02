import { buildListingDetailsUrl } from "./bookingAPI";
import { placeholderImage } from "../utils/image";
import { resolvePrimaryAccommodationImageUrl } from "../../../utils/accommodationImage";
import { resolveHostName, resolveSubtitleCity } from "../utils/guestDashboardUtils";

export const buildPropertySummary = async (propertyId) => {
  const response = await fetch(buildListingDetailsUrl(propertyId));
  if (!response.ok) {
    throw new Error("Failed to fetch listing details.");
  }

  const data = await response.json().catch(() => ({}));
  const property = data.property || {};
  const images = Array.isArray(data.images) ? data.images : [];
  const location = data.location || {};
  const host = data.host || data.hostInfo || property.host || property.hostInfo || null;

  const hostNameFromHost =
    host?.name ||
    host?.fullName ||
    (host?.firstName && host?.lastName ? `${host.firstName} ${host.lastName}` : null);

  const hostNameFromProperty =
    property.username && property.familyname
      ? `${String(property.username).trim()} ${String(property.familyname).trim()}`
      : (property.username && String(property.username).trim()) ||
        (property.familyname && String(property.familyname).trim()) ||
        null;

  const subtitle = property.subtitle || "";
  const city = location.city || resolveSubtitleCity(subtitle) || "";
  const country = location.country || property.country || "";

  return {
    title: property.title || property.name || `Property #${property.id || propertyId}`,
    imageUrl: resolvePrimaryAccommodationImageUrl(images, "thumb"),
    city,
    country,
    locationLabel: [city, country].filter(Boolean).join(", ") || city || country || "Unknown location",
    hostName: resolveHostName(hostNameFromHost, hostNameFromProperty, data.hostName, property.hostName),
  };
};

const buildFallbackPropertySummary = (propertyId) => ({
  title: `Property #${propertyId}`,
  imageUrl: placeholderImage,
  city: "",
  country: "",
  locationLabel: "Unknown location",
  hostName: "",
});

export const fetchPropertySummaries = async (propertyIds) => {
  const uniquePropertyIds = [...new Set((Array.isArray(propertyIds) ? propertyIds : []).filter(Boolean))];
  if (uniquePropertyIds.length === 0) {
    return {};
  }

  const summaries = await Promise.all(
    uniquePropertyIds.map(async (propertyId) => {
      try {
        return [propertyId, await buildPropertySummary(propertyId)];
      } catch {
        return [propertyId, buildFallbackPropertySummary(propertyId)];
      }
    })
  );

  return summaries.reduce((accumulator, [propertyId, summary]) => {
    accumulator[propertyId] = summary;
    return accumulator;
  }, {});
};
