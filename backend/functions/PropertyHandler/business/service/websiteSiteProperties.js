export const SITE_PROPERTIES_OVERRIDE_KEY = "siteProperties";
export const MAX_SITE_PROPERTIES = 12;
export const MAX_SITE_PROPERTY_SLUG_LENGTH = 60;

const SITE_PROPERTY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const cleanText = (value) => (typeof value === "string" ? value.trim() : "");

const invalid = (message) => new TypeError(`siteProperties ${message}`);

const normalizeEntry = (entry, index) => {
  if (!isPlainObject(entry)) {
    throw invalid(`entry ${index} must be a plain object.`);
  }

  const propertyId = cleanText(entry.propertyId);
  const slug = cleanText(entry.slug).toLowerCase();
  if (!propertyId) {
    throw invalid(`entry ${index} needs a propertyId.`);
  }
  if (slug.length > MAX_SITE_PROPERTY_SLUG_LENGTH || !SITE_PROPERTY_SLUG_PATTERN.test(slug)) {
    throw invalid(`entry ${index} needs a slug of lowercase letters, digits and single hyphens.`);
  }

  return { propertyId, slug };
};

export const normalizeSiteProperties = (value, mainPropertyId) => {
  if (!Array.isArray(value)) {
    throw invalid("must be an array.");
  }
  if (value.length > MAX_SITE_PROPERTIES) {
    throw invalid(`can hold at most ${MAX_SITE_PROPERTIES} properties.`);
  }

  const entries = value.map(normalizeEntry);
  const propertyIds = new Set();
  const slugs = new Set();
  entries.forEach(({ propertyId, slug }) => {
    if (propertyIds.has(propertyId) || slugs.has(slug)) {
      throw invalid("must not list a property or a slug twice.");
    }
    propertyIds.add(propertyId);
    slugs.add(slug);
  });

  const mainEntry = entries.find((entry) => entry.propertyId === cleanText(mainPropertyId));
  if (entries.length > 0 && !mainEntry) {
    throw invalid("must list the main property of the website.");
  }

  return entries;
};

export const withNormalizedSiteProperties = (overrides, mainPropertyId) => {
  if (!isPlainObject(overrides) || !Object.hasOwn(overrides, SITE_PROPERTIES_OVERRIDE_KEY)) {
    return overrides;
  }

  return {
    ...overrides,
    [SITE_PROPERTIES_OVERRIDE_KEY]: normalizeSiteProperties(overrides[SITE_PROPERTIES_OVERRIDE_KEY], mainPropertyId),
  };
};

export const listOtherSitePropertyIds = (overrides, mainPropertyId) => {
  if (!isPlainObject(overrides) || !Object.hasOwn(overrides, SITE_PROPERTIES_OVERRIDE_KEY)) {
    return [];
  }

  return normalizeSiteProperties(overrides[SITE_PROPERTIES_OVERRIDE_KEY], mainPropertyId)
    .map((entry) => entry.propertyId)
    .filter((propertyId) => propertyId !== cleanText(mainPropertyId));
};

const readStoredSitePropertyIds = (overrides) => {
  const storedList = isPlainObject(overrides) ? overrides[SITE_PROPERTIES_OVERRIDE_KEY] : undefined;
  return Array.isArray(storedList) ? storedList.filter(isPlainObject).map((entry) => cleanText(entry.propertyId)) : [];
};

export const listNewSitePropertyIds = (overrides, mainPropertyId, storedOverridesList) => {
  const storedPropertyIds = new Set(storedOverridesList.flatMap(readStoredSitePropertyIds));
  return listOtherSitePropertyIds(overrides, mainPropertyId).filter((propertyId) => !storedPropertyIds.has(propertyId));
};
