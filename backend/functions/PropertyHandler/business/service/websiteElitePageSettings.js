import { DirectBookingWebsiteRatePlanService } from "./directBookingWebsiteRatePlanService.js";
import { SITE_PROPERTIES_OVERRIDE_KEY } from "./websiteSiteProperties.js";
import { withinTimeLimit } from "../../util/timeLimit.js";

export const SITE_PAGES_OVERRIDE_KEY = "sitePages";
export const SITE_PAGES_ENTITLEMENT = "website.unlimited_pages";
export const SITE_PROPERTIES_ENTITLEMENT = "website.multi_property";
export const WEBSITE_PLAN_READ_TIMEOUT_MS = 3000;

const ELITE_OVERRIDE_ENTITLEMENTS = Object.freeze([
  [SITE_PAGES_OVERRIDE_KEY, SITE_PAGES_ENTITLEMENT],
  [SITE_PROPERTIES_OVERRIDE_KEY, SITE_PROPERTIES_ENTITLEMENT],
]);

const hasKey = (overrides, key) => Boolean(overrides) && Object.hasOwn(overrides, key);

const listEliteKeys = (...overridesList) =>
  ELITE_OVERRIDE_ENTITLEMENTS.filter(([key]) => overridesList.some((overrides) => hasKey(overrides, key)));

const listBlockedKeys = (eliteKeys, entitlements) =>
  eliteKeys.filter(([, entitlement]) => !entitlements.includes(entitlement)).map(([key]) => key);

const withoutKeys = (overrides, keys) =>
  keys.some((key) => hasKey(overrides, key))
    ? Object.fromEntries(Object.entries(overrides).filter(([key]) => !keys.includes(key)))
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
    const eliteKeys = listEliteKeys(overrides);
    if (eliteKeys.length === 0) return overrides;
    return withoutKeys(overrides, listBlockedKeys(eliteKeys, await this.readEntitlements(hostId)));
  }

  async servePageSettingsOnDraft(draft) {
    const eliteKeys = listEliteKeys(draft?.contentOverrides, draft?.publishedContentOverrides);
    if (eliteKeys.length === 0) return draft;

    const blockedKeys = listBlockedKeys(eliteKeys, await this.readEntitlements(draft.hostId));
    if (blockedKeys.length === 0) return draft;

    return {
      ...draft,
      contentOverrides: withoutKeys(draft.contentOverrides, blockedKeys),
      publishedContentOverrides: withoutKeys(draft.publishedContentOverrides, blockedKeys),
    };
  }

  async readEntitlements(hostId) {
    try {
      const { entitlements } = await withinTimeLimit(
        this.ratePlanService.getCurrentEntitlements(hostId),
        this.planReadTimeoutMs,
        () => new Error("The website plan read did not answer in time.")
      );
      return entitlements;
    } catch (error) {
      console.error(
        `[WebsitePageSettings] the website plan of host ${hostId} could not be read, so Elite page settings are not served.`,
        error
      );
      return [];
    }
  }
}
