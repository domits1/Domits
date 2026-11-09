import { useWebsiteEntitlements } from "../../hooks/useWebsiteEntitlements";
import { WEBSITE_ENTITLEMENT_UNLIMITED_PAGES } from "../../services/websitePlanService";

export const useWebsiteEditorSitePages = () => {
  const { has } = useWebsiteEntitlements();

  return {
    isEliteHost: has(WEBSITE_ENTITLEMENT_UNLIMITED_PAGES),
  };
};
