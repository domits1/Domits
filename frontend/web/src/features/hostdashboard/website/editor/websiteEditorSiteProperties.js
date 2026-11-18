import { MAX_SITE_PROPERTY_SLUG_LENGTH, isSitePropertySlug } from "../rendering/websiteSiteProperties";

export const SITE_PROPERTIES_OVERRIDE_KEY = "siteProperties";
export const MAX_SITE_PROPERTIES = 12;
export const SITE_PROPERTY_NOT_LISTED_MESSAGE =
  "One of the properties on your website is no longer one of your listings. Remove it from Properties, then choose Update live site.";

const NOT_LISTED_REFUSALS = new Set([
  "You must be the owner of the property to access it.",
  "siteProperties lists a property that does not exist.",
]);

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const cutSlug = (value, maxLength) => value.slice(0, maxLength).replaceAll(/^-+|-+$/g, "");

export const cleanSitePropertySlug = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");

export const suggestSitePropertySlug = (title, takenSlugs = []) => {
  const words = String(title ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replaceAll(/\p{M}/gu, "")
    .replaceAll(/[^a-z0-9]+/g, "-");
  const baseSlug = cutSlug(words, MAX_SITE_PROPERTY_SLUG_LENGTH) || "property";
  const taken = new Set(takenSlugs.map(cleanSitePropertySlug));
  let slug = baseSlug;
  for (let number = 2; taken.has(slug); number += 1) {
    slug = `${cutSlug(baseSlug, MAX_SITE_PROPERTY_SLUG_LENGTH - `-${number}`.length)}-${number}`;
  }
  return slug;
};

export const describeSitePropertySlugProblem = (slug, otherSlugs) => {
  const cleanedSlug = cleanSitePropertySlug(slug);
  if (!isSitePropertySlug(cleanedSlug)) {
    return `Use lowercase letters, digits and single hyphens, at most ${MAX_SITE_PROPERTY_SLUG_LENGTH} characters.`;
  }
  return otherSlugs.includes(cleanedSlug) ? "Another property on this website already has this address." : "";
};

export const readSiteProperties = (overrides) => {
  const storedList = isPlainObject(overrides) ? overrides[SITE_PROPERTIES_OVERRIDE_KEY] : [];
  return (Array.isArray(storedList) ? storedList : []).filter(isPlainObject).map((entry) => ({
    propertyId: typeof entry.propertyId === "string" ? entry.propertyId.trim() : "",
    slug: cleanSitePropertySlug(entry.slug),
  }));
};

const toSavedList = (entries) =>
  entries.length > 1
    ? entries.map(({ propertyId, slug }) => ({ propertyId, slug: cleanSitePropertySlug(slug) }))
    : null;

const isSameList = (left, right) => JSON.stringify(toSavedList(left)) === JSON.stringify(toSavedList(right));

const withList = (overrides, list) => {
  const nextOverrides = { ...overrides, [SITE_PROPERTIES_OVERRIDE_KEY]: list };
  if (list === undefined) {
    delete nextOverrides[SITE_PROPERTIES_OVERRIDE_KEY];
  }
  return nextOverrides;
};

export const applySitePropertiesEdit = (overrides, editedEntries, publishedOverrides = {}) => {
  if (!editedEntries || isSameList(editedEntries, readSiteProperties(overrides))) {
    return overrides;
  }
  if (isSameList(editedEntries, readSiteProperties(publishedOverrides))) {
    return withList(overrides, publishedOverrides[SITE_PROPERTIES_OVERRIDE_KEY]);
  }
  return withList(overrides, toSavedList(editedEntries) ?? undefined);
};

export const findSitePropertiesProblem = (entries, { forPublish }) => {
  if (entries.length < 2) {
    return "";
  }
  const slugEntry = entries.find((entry) => entry.slugProblem);
  if (slugEntry) {
    return `Fix the address of ${slugEntry.title}: ${slugEntry.slugProblem}`;
  }
  if (entries.some((entry) => !entry.isListed)) {
    return SITE_PROPERTY_NOT_LISTED_MESSAGE;
  }
  const inactiveEntry = forPublish && entries.find((entry) => !entry.isMainProperty && !entry.isActive);
  return inactiveEntry
    ? `${inactiveEntry.title} is not live on Domits. Remove it from Properties or make it live before you publish.`
    : "";
};

export const explainSitePropertiesSaveError = (error) =>
  NOT_LISTED_REFUSALS.has(error?.message) ? new Error(SITE_PROPERTY_NOT_LISTED_MESSAGE) : error;
