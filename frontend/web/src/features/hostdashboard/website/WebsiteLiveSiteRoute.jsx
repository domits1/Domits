import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PageNotFound from "../../../utils/error/404NotFound";
import WebsitePublicSitePage, { normalizeWebsiteDomain } from "./WebsitePublicSitePage";
import { MAIN_SITE_PAGE_KEY, isSitePagePath, resolveSitePageFromPath } from "./rendering/websitePages";
import { fetchPublicWebsiteRenderModel } from "./services/websitePublicSiteService";

const readRequestedSiteId = () =>
  String(new URLSearchParams(globalThis.location?.search || "").get("siteId") || "").trim();

const readServedSitePages = async ({ siteId, domain }) => {
  try {
    const renderPayload = await fetchPublicWebsiteRenderModel({ siteId, domain });
    return renderPayload?.contentOverrides?.sitePages;
  } catch {
    return undefined;
  }
};

export default function WebsiteLiveSiteRoute() {
  const { domain: routeDomain = "", "*": sitePath = "" } = useParams();
  const domain = normalizeWebsiteDomain(routeDomain);
  const siteId = readRequestedSiteId();
  const siteKey = JSON.stringify([domain, siteId]);
  const [servedSitePages, setServedSitePages] = useState({ siteKey: "", sitePages: undefined });
  const isServedSiteKnown = servedSitePages.siteKey === siteKey;
  const isPagePath = sitePath !== "" && isSitePagePath(sitePath);
  const needsPageCheck = isPagePath && !isServedSiteKnown;

  const rememberSitePages = useCallback((sitePages) => setServedSitePages({ siteKey, sitePages }), [siteKey]);

  useEffect(() => {
    if (!needsPageCheck) {
      return undefined;
    }

    let isCurrent = true;
    readServedSitePages({ siteId, domain }).then((sitePages) => {
      if (isCurrent) {
        setServedSitePages({ siteKey, sitePages });
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [domain, needsPageCheck, siteId, siteKey]);

  const isPageOn =
    isPagePath &&
    isServedSiteKnown &&
    resolveSitePageFromPath(sitePath, servedSitePages.sitePages) !== MAIN_SITE_PAGE_KEY;
  const showsSite = sitePath === "" || isPageOn;

  return showsSite ? <WebsitePublicSitePage onSitePagesLoaded={rememberSitePages} /> : <PageNotFound />;
}
