import { useState } from "react";
import { useWebsiteEntitlements } from "../../hooks/useWebsiteEntitlements";
import { WEBSITE_ENTITLEMENT_UNLIMITED_PAGES } from "../../services/websitePlanService";
import {
  MAIN_SITE_PAGE_KEY,
  SITE_PAGES_OVERRIDE_KEY,
  listSitePageMenuItems,
  normalizeSitePages,
} from "../../rendering/websitePages";

const SITE_PAGES_TEMPLATE_KEY = "panorama-landing";

export const useWebsiteEditorSitePages = ({ draftTemplateKey, workingOverrides }) => {
  const { has } = useWebsiteEntitlements();
  const isEliteHost = has(WEBSITE_ENTITLEMENT_UNLIMITED_PAGES);
  const canEditSitePages = isEliteHost && draftTemplateKey === SITE_PAGES_TEMPLATE_KEY;
  const [editedSitePages, setEditedSitePages] = useState(null);
  const [selectedPageKey, setSelectedPageKey] = useState(MAIN_SITE_PAGE_KEY);
  const sitePages = editedSitePages || normalizeSitePages(workingOverrides[SITE_PAGES_OVERRIDE_KEY]);
  const menuItems = canEditSitePages ? listSitePageMenuItems(sitePages) : [];
  const isSelectedPageShown = menuItems.some((item) => item.key === selectedPageKey);

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
    menuItems,
    previewPageKey: isSelectedPageShown ? selectedPageKey : MAIN_SITE_PAGE_KEY,
    selectPreviewPage: setSelectedPageKey,
    setSitePageEnabled: (pageKey, enabled) => {
      updateSitePage(pageKey, { enabled });
      if (enabled) {
        setSelectedPageKey(pageKey);
      }
    },
    setSitePageNavLabel: (pageKey, navLabel) => updateSitePage(pageKey, { navLabel }),
    resetSitePagesEdit: () => setEditedSitePages(null),
  };
};
