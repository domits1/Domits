export const buildPublishedWebsitePath = (domain, siteId = "") => {
  const path = `/website-live/${encodeURIComponent(domain)}`;
  const normalizedSiteId = String(siteId || "").trim();
  return normalizedSiteId ? `${path}?siteId=${encodeURIComponent(normalizedSiteId)}` : path;
};

export const buildPublishedWebsiteHref = (domain, siteId = "", domainStatus = "") => {
  const normalizedDomain = String(domain || "").trim().toLowerCase();
  if (!normalizedDomain) {
    return "";
  }

  if (String(domainStatus || "").trim().toUpperCase() === "ACTIVE") {
    return `https://${normalizedDomain}`;
  }

  return buildPublishedWebsitePath(normalizedDomain, siteId);
};
