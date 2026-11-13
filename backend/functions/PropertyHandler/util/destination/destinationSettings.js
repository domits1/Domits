import { toDestinationSlug } from "./destinationSlug.js";

const DEFAULT_MIN_ACTIVE_LISTINGS = 1;
const DEFAULT_PARENT_FROM_ANY_CHILD = true;
const DEFAULT_CONTINENT_ORDER = ["europe", "caribbean", "north-america", "south-america", "asia", "oceania", "africa"];

const readPositiveInteger = (value, fallback) => {
  const text = String(value ?? "").trim();
  if (!/^\d+$/.test(text)) {
    return fallback;
  }
  const parsed = Number(text);
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : fallback;
};

const readBoolean = (value, fallback) => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (normalized === "true" || normalized === "yes" || normalized === "1") {
    return true;
  }
  if (normalized === "false" || normalized === "no" || normalized === "0") {
    return false;
  }
  return fallback;
};

const readSlugList = (value) => [
  ...new Set(
    String(value ?? "")
      .split(",")
      .map((entry) => toDestinationSlug(entry))
      .filter(Boolean)
  ),
];

export const readDestinationSettings = (env = process.env) => ({
  minActiveListings: readPositiveInteger(env.DESTINATION_MIN_ACTIVE_LISTINGS, DEFAULT_MIN_ACTIVE_LISTINGS),
  parentFromAnyChild: readBoolean(env.DESTINATION_PARENT_FROM_ANY_CHILD, DEFAULT_PARENT_FROM_ANY_CHILD),
  featured: readSlugList(env.DESTINATION_FEATURED),
  continentOrder: readSlugList(env.DESTINATION_CONTINENT_ORDER || DEFAULT_CONTINENT_ORDER.join(",")),
});

export const isDestinationEligible = (
  { activeListings = 0, directListings = activeListings, eligibleChildren = 0 } = {},
  settings = readDestinationSettings()
) => {
  if (!settings.parentFromAnyChild) {
    return Number(directListings) >= settings.minActiveListings;
  }
  return Number(activeListings) >= settings.minActiveListings || Number(eligibleChildren) > 0;
};
