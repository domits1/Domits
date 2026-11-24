import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import PageNotFound from "../../../utils/error/404NotFound";
import WebsitePublicSitePage, { normalizeWebsiteDomain } from "./WebsitePublicSitePage";
import { MAIN_SITE_PAGE_KEY, isSitePagePath, resolveSitePageFromPath } from "./rendering/websitePages";
import {
  isSitePropertyPath,
  normalizeServedSiteProperties,
  resolveSitePropertyRoute,
} from "./rendering/websiteSiteProperties";
import { fetchPublicWebsiteRenderModel } from "./services/websitePublicSiteService";

const readRequestedSiteId = () =>
  String(new URLSearchParams(globalThis.location?.search || "").get("siteId") || "").trim();

const readServedSite = async ({ siteId, domain }) => {
  try {
    const renderPayload = await fetchPublicWebsiteRenderModel({ siteId, domain });
    return {
      sitePages: renderPayload?.contentOverrides?.sitePages,
      siteProperties: normalizeServedSiteProperties(renderPayload?.siteProperties),
    };
  } catch {
    return { sitePages: undefined, siteProperties: [] };
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
  const isLiveViewPropertyPath = isLiveViewSubPath && isSitePropertyPath(sitePath);
  const isLiveViewCheckedPath = isLiveViewPagePath || isLiveViewPropertyPath;
  const needsPageCheck = isLiveViewCheckedPath && !servedSite;

  const rememberServedSite = useCallback(
    (key, served, isCheck = false) =>
      setServedSites((current) => (isCheck && current.has(key) ? current : new Map(current).set(key, served))),
    []
  );
  const rememberCurrentSitePages = useCallback(
    (sitePages, siteProperties) => rememberServedSite(siteKey, { sitePages, siteProperties }),
    [rememberServedSite, siteKey]
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
    void readServedSite({ siteId, domain }).then((served) => {
      pendingSiteKeysRef.current.delete(siteKey);
      if (isMountedRef.current) {
        rememberServedSite(siteKey, served, true);
      }
    });
  }, [domain, needsPageCheck, rememberServedSite, siteId, siteKey]);

  const isPageOn =
    isLiveViewPagePath &&
    Boolean(servedSite) &&
    resolveSitePageFromPath(sitePath, servedSite.sitePages) !== MAIN_SITE_PAGE_KEY;
  const isPropertyOn =
    isLiveViewPropertyPath &&
    Boolean(servedSite) &&
    resolveSitePropertyRoute(sitePath, servedSite.siteProperties)?.isFound === true;

  if (isLiveViewSubPath && !isPageOn && !isPropertyOn) {
    return <PageNotFound />;
  }

  return (
    <WebsitePublicSitePage onSitePagesLoaded={rememberCurrentSitePages} requiresActivePage={isLiveViewCheckedPath} />
  );
}
