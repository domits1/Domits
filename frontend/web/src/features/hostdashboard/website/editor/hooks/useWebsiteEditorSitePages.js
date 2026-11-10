import { useState } from "react";
import { useWebsiteEntitlements } from "../../hooks/useWebsiteEntitlements";
import { WEBSITE_ENTITLEMENT_UNLIMITED_PAGES } from "../../services/websitePlanService";
import { SITE_PAGES_OVERRIDE_KEY, normalizeSitePages } from "../../rendering/websitePages";

const SITE_PAGES_TEMPLATE_KEY = "panorama-landing";

export const useWebsiteEditorSitePages = ({ draftTemplateKey, workingOverrides }) => {
  const { has } = useWebsiteEntitlements();
  const isEliteHost = has(WEBSITE_ENTITLEMENT_UNLIMITED_PAGES);
  const canEditSitePages = isEliteHost && draftTemplateKey === SITE_PAGES_TEMPLATE_KEY;
  const [editedSitePages, setEditedSitePages] = useState(null);
  const sitePages = editedSitePages || normalizeSitePages(workingOverrides[SITE_PAGES_OVERRIDE_KEY]);

  const updateSitePage = (pageKey, changes) => {
    setEditedSitePages((currentSitePages) => {
      const baseSitePages = currentSitePages || sitePages;
      return { ...baseSitePages, [pageKey]: { ...baseSitePages[pageKey], ...changes } };
    });
  };

  return {
    isEliteHost,
    canEditSitePages,
    sitePages,
    sitePagesEdit: canEditSitePages ? editedSitePages : null,
    setSitePageEnabled: (pageKey, enabled) => updateSitePage(pageKey, { enabled }),
    setSitePageNavLabel: (pageKey, navLabel) => updateSitePage(pageKey, { navLabel }),
    resetSitePagesEdit: () => setEditedSitePages(null),
  };
};
