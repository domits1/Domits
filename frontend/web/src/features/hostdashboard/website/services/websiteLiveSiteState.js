import { fetchWebsiteSiteByPropertyId } from "./websiteSiteService";
import { fetchWebsitePropertyDetails } from "./websitePropertyService";
import { resolveLiveSiteStaleness } from "./websiteListingChange";

export const resolveWebsiteDraftLiveSiteState = async (draft, propertyDetails) => {
  if (!propertyDetails) {
    return null;
  }

  try {
    const siteSummary = await fetchWebsiteSiteByPropertyId(draft.propertyId);
    return resolveLiveSiteStaleness(siteSummary, propertyDetails);
  } catch {
    return null;
  }
};

export const buildWebsiteDraftPreviewCacheKeyMap = (previewEntries) =>
  Object.fromEntries(
    previewEntries
      .filter(([, , , liveSiteState]) => liveSiteState !== null)
      .map(([propertyId, , previewCacheKey]) => [propertyId, previewCacheKey])
  );

export const reloadListingDetailsAfterPublish = async (propertyId, siteSummary) => {
  try {
    return await fetchWebsitePropertyDetails(propertyId);
  } catch {
    const publishedSnapshot = siteSummary?.site?.publishedPropertySnapshot;
    return publishedSnapshot && typeof publishedSnapshot === "object" ? publishedSnapshot : null;
  }
};
