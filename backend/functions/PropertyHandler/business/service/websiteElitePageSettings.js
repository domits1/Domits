import { DirectBookingWebsiteRatePlanService } from "./directBookingWebsiteRatePlanService.js";
import { withinTimeLimit } from "../../util/timeLimit.js";

export const SITE_PAGES_OVERRIDE_KEY = "sitePages";
export const SITE_PAGES_ENTITLEMENT = "website.unlimited_pages";
export const WEBSITE_PLAN_READ_TIMEOUT_MS = 3000;

const hasSitePages = (overrides) => Boolean(overrides) && Object.hasOwn(overrides, SITE_PAGES_OVERRIDE_KEY);

const withoutSitePages = (overrides) =>
  hasSitePages(overrides)
    ? Object.fromEntries(Object.entries(overrides).filter(([key]) => key !== SITE_PAGES_OVERRIDE_KEY))
    : overrides;

export class WebsiteElitePageSettings {
  constructor(
    ratePlanService = new DirectBookingWebsiteRatePlanService(),
    { planReadTimeoutMs = WEBSITE_PLAN_READ_TIMEOUT_MS } = {}
  ) {
    this.ratePlanService = ratePlanService;
    this.planReadTimeoutMs = planReadTimeoutMs;
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
      const { entitlements } = await withinTimeLimit(
        this.ratePlanService.getCurrentEntitlements(hostId),
        this.planReadTimeoutMs,
        () => new Error("The website plan read did not answer in time.")
      );
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
