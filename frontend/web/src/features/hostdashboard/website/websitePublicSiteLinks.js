export const buildPublishedWebsitePath = (domain = "", siteId = "") => {
  const normalizedDomain = String(domain || "").trim().toLowerCase();
  const normalizedSiteId = String(siteId || "").trim();
  if (!normalizedDomain) {
    return normalizedSiteId ? `/website-live?siteId=${encodeURIComponent(normalizedSiteId)}` : "";
  }

  const path = `/website-live/${encodeURIComponent(normalizedDomain)}`;
  return normalizedSiteId ? `${path}?siteId=${encodeURIComponent(normalizedSiteId)}` : path;
};

export const buildWebsitePreviewPath = (draftId) =>
  `/website-preview/${encodeURIComponent(String(draftId || "").trim())}`;

export const buildPublishedWebsiteHref = (domain, siteId = "", domainStatus = "") => {
  const normalizedDomain = String(domain || "").trim().toLowerCase();

  if (normalizedDomain && String(domainStatus || "").trim().toUpperCase() === "ACTIVE") {
    return `https://${normalizedDomain}`;
  }

  return buildPublishedWebsitePath(normalizedDomain, siteId);
};
