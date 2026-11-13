import { SITE_PAGES_OVERRIDE_KEY, normalizeSitePages } from "../rendering/websitePages";

const hasStoredSitePages = (overrides) => Object.prototype.hasOwnProperty.call(overrides, SITE_PAGES_OVERRIDE_KEY);

const readStoredSitePages = (overrides) =>
  hasStoredSitePages(overrides) ? overrides[SITE_PAGES_OVERRIDE_KEY] : undefined;

export const isSameSitePages = (left, right) =>
  JSON.stringify(normalizeSitePages(left)) === JSON.stringify(normalizeSitePages(right));

export const omitSitePages = (overrides) => {
  if (!hasStoredSitePages(overrides)) {
    return overrides;
  }

  const remainingOverrides = { ...overrides };
  delete remainingOverrides[SITE_PAGES_OVERRIDE_KEY];
  return remainingOverrides;
};

export const applySitePagesEdit = (overrides, editedSitePages, publishedOverrides = {}) => {
  if (!editedSitePages || isSameSitePages(editedSitePages, readStoredSitePages(overrides))) {
    return overrides;
  }

  if (isSameSitePages(editedSitePages, readStoredSitePages(publishedOverrides))) {
    return hasStoredSitePages(publishedOverrides)
      ? { ...overrides, [SITE_PAGES_OVERRIDE_KEY]: publishedOverrides[SITE_PAGES_OVERRIDE_KEY] }
      : omitSitePages(overrides);
  }

  return { ...overrides, [SITE_PAGES_OVERRIDE_KEY]: normalizeSitePages(editedSitePages) };
};
