import { SITE_PAGES_OVERRIDE_KEY } from "./websiteElitePageSettings.js";

export const isWebsiteContactEnabled = () =>
  String(process.env.DIRECT_BOOKING_WEBSITE_CONTACT_ENABLED || "").trim() === "true";

export const servesContactMessages = (servedContentOverrides) =>
  isWebsiteContactEnabled() &&
  Boolean(servedContentOverrides) &&
  Object.hasOwn(servedContentOverrides, SITE_PAGES_OVERRIDE_KEY);
