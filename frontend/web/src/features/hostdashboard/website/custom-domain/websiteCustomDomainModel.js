const getWebsiteDomainByType = (siteSummary, domainType) => {
  const normalizedDomainType = String(domainType || "").trim().toUpperCase();
  const domains = Array.isArray(siteSummary?.domains) ? siteSummary.domains : [];
  return (
    domains.find(
      (domainEntry) => String(domainEntry?.domainType || "").trim().toUpperCase() === normalizedDomainType
    ) || null
  );
};

export const getFallbackWebsiteDomain = (siteSummary) =>
  getWebsiteDomainByType(siteSummary, "FALLBACK") ||
  (siteSummary?.primaryDomain && typeof siteSummary.primaryDomain === "object"
    ? siteSummary.primaryDomain
    : null);

export const getCustomWebsiteDomain = (siteSummary) => getWebsiteDomainByType(siteSummary, "CUSTOM");

export const getCustomDomainStatusLabel = (customDomain, formatStatusLabel) => {
  if (!customDomain?.status) {
    return "Not requested";
  }

  return formatStatusLabel(customDomain.status);
};

export const isCustomDomainVerified = (customDomain) =>
  String(customDomain?.status || "").trim().toUpperCase() === "VERIFIED";

export const isCustomDomainActive = (customDomain) =>
  String(customDomain?.status || "").trim().toUpperCase() === "ACTIVE";

export const isCustomDomainPending = (customDomain) =>
  String(customDomain?.status || "").trim().toUpperCase() === "PENDING";
