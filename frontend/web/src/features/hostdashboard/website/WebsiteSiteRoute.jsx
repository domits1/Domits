import React, { useCallback, useEffect, useRef, useState } from "react";
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

export default function WebsiteSiteRoute() {
  const { domain: routeDomain = "", "*": sitePath = "" } = useParams();
  const domain = normalizeWebsiteDomain(routeDomain);
  const siteId = readRequestedSiteId();
  const siteKey = JSON.stringify([domain, siteId]);
  const [servedSites, setServedSites] = useState(() => new Map());
  const pendingSiteKeysRef = useRef(new Set());
  const isMountedRef = useRef(true);
  const servedSite = servedSites.get(siteKey);
  const isLiveViewSubPath = routeDomain !== "" && sitePath !== "";
  const isLiveViewPagePath = isLiveViewSubPath && isSitePagePath(sitePath);
  const needsPageCheck = isLiveViewPagePath && !servedSite;

  const rememberSitePages = useCallback(
    (key, sitePages, isCheck = false) =>
      setServedSites((current) => (isCheck && current.has(key) ? current : new Map(current).set(key, { sitePages }))),
    []
  );
  const rememberCurrentSitePages = useCallback(
    (sitePages) => rememberSitePages(siteKey, sitePages),
    [rememberSitePages, siteKey]
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!needsPageCheck || pendingSiteKeysRef.current.has(siteKey)) {
      return;
    }

    pendingSiteKeysRef.current.add(siteKey);
    void readServedSitePages({ siteId, domain }).then((sitePages) => {
      pendingSiteKeysRef.current.delete(siteKey);
      if (isMountedRef.current) {
        rememberSitePages(siteKey, sitePages, true);
      }
    });
  }, [domain, needsPageCheck, rememberSitePages, siteId, siteKey]);

  const isPageOn =
    isLiveViewPagePath &&
    Boolean(servedSite) &&
    resolveSitePageFromPath(sitePath, servedSite.sitePages) !== MAIN_SITE_PAGE_KEY;

  if (isLiveViewSubPath && !isPageOn) {
    return <PageNotFound />;
  }

  return <WebsitePublicSitePage onSitePagesLoaded={rememberCurrentSitePages} requiresActivePage={isLiveViewPagePath} />;
}
