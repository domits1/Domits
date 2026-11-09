import { DirectBookingWebsiteRatePlanService } from "./directBookingWebsiteRatePlanService.js";

export const SITE_PAGES_OVERRIDE_KEY = "sitePages";
export const SITE_PAGES_ENTITLEMENT = "website.unlimited_pages";

const hasSitePages = (overrides) =>
  Boolean(overrides) &&
  typeof overrides === "object" &&
  !Array.isArray(overrides) &&
  Object.hasOwn(overrides, SITE_PAGES_OVERRIDE_KEY);

const withoutSitePages = (overrides) =>
  hasSitePages(overrides)
    ? Object.fromEntries(Object.entries(overrides).filter(([key]) => key !== SITE_PAGES_OVERRIDE_KEY))
    : overrides;

export class WebsiteElitePageSettings {
  constructor(ratePlanService = new DirectBookingWebsiteRatePlanService()) {
    this.ratePlanService = ratePlanService;
  }

  async servePageSettingsForHost({ hostId, overrides }) {
    if (!hasSitePages(overrides)) return overrides;
    return (await this.mayServePageSettings(hostId)) ? overrides : withoutSitePages(overrides);
  }

  async servePageSettingsOnDraft(draft) {
    const draftHasSitePages = hasSitePages(draft?.contentOverrides) || hasSitePages(draft?.publishedContentOverrides);
    if (!draftHasSitePages || (await this.mayServePageSettings(draft.hostId))) return draft;

    return {
      ...draft,
      contentOverrides: withoutSitePages(draft.contentOverrides),
      publishedContentOverrides: withoutSitePages(draft.publishedContentOverrides),
    };
  }

  async mayServePageSettings(hostId) {
    try {
      const { entitlements } = await this.ratePlanService.getCurrentEntitlements(hostId);
      return entitlements.includes(SITE_PAGES_ENTITLEMENT);
    } catch (error) {
      console.error(
        `[WebsitePageSettings] the website plan of host ${hostId} could not be read, so site pages are not served.`,
        error
      );
      return false;
    }
  }
}
