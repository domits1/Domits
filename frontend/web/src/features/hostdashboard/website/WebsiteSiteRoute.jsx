import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PageNotFound from "../../../utils/error/404NotFound";
import WebsitePublicSitePage, { normalizeWebsiteDomain } from "./WebsitePublicSitePage";
import { MAIN_SITE_PAGE_KEY, isSitePagePath, resolveSitePageFromPath } from "./rendering/websitePages";
import { fetchPublicWebsiteRenderModel } from "./services/websitePublicSiteService";

const readRequestedSiteId = () =>
  String(new URLSearchParams(globalThis.location?.search || "").get("siteId") || "").trim();

const readServedSite = async ({ siteId, domain }) => {
  try {
    const renderPayload = await fetchPublicWebsiteRenderModel({ siteId, domain });
    return { sitePages: renderPayload?.contentOverrides?.sitePages, renderPayload };
  } catch {
    return { sitePages: undefined, renderPayload: null };
  }
};

export default function WebsiteSiteRoute() {
  const { domain: routeDomain = "", "*": sitePath = "" } = useParams();
  const domain = normalizeWebsiteDomain(routeDomain);
  const siteId = readRequestedSiteId();
  const siteKey = JSON.stringify([domain, siteId]);
  const [servedSite, setServedSite] = useState({ siteKey: "", sitePages: undefined, renderPayload: null });
  const isServedSiteKnown = servedSite.siteKey === siteKey;
  const isLiveViewSubPath = routeDomain !== "" && sitePath !== "";
  const isLiveViewPagePath = isLiveViewSubPath && isSitePagePath(sitePath);
  const needsPageCheck = isLiveViewPagePath && !isServedSiteKnown;

  const rememberSitePages = useCallback(
    (sitePages) => setServedSite({ siteKey, sitePages, renderPayload: null }),
    [siteKey]
  );

  useEffect(() => {
    if (!needsPageCheck) {
      return undefined;
    }

    let isCurrent = true;
    readServedSite({ siteId, domain }).then(({ sitePages, renderPayload }) => {
      if (isCurrent) {
        setServedSite({ siteKey, sitePages, renderPayload });
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [domain, needsPageCheck, siteId, siteKey]);

  const isPageOn =
    isLiveViewPagePath &&
    isServedSiteKnown &&
    resolveSitePageFromPath(sitePath, servedSite.sitePages) !== MAIN_SITE_PAGE_KEY;

  if (isLiveViewSubPath && !isPageOn) {
    return <PageNotFound />;
  }

  return (
    <WebsitePublicSitePage
      onSitePagesLoaded={rememberSitePages}
      initialRenderPayload={isPageOn ? servedSite.renderPayload : null}
    />
  );
}
