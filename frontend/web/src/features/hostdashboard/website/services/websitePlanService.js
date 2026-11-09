import { PROPERTY_API_BASE } from "../../hostproperty/constants";
import { fetchWithWebsiteSession } from "./websiteSession";

const WEBSITE_ENTITLEMENTS_URL = `${PROPERTY_API_BASE}/website/rate-plan?view=entitlements`;

export const WEBSITE_ENTITLEMENT_UNLIMITED_PAGES = "website.unlimited_pages";

export const getWebsiteEntitlements = async () => {
  const response = await fetchWithWebsiteSession(WEBSITE_ENTITLEMENTS_URL, {
    method: "GET",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Website entitlements request failed (${response.status}).`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload?.entitlements)) {
    throw new Error("Website entitlements response has no entitlement list.");
  }
  return payload.entitlements.filter((entitlement) => typeof entitlement === "string");
};
