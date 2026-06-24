export const normalizeWebsiteSiteSummary = (payload) => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const site = payload.site && typeof payload.site === "object" ? payload.site : null;
  const primaryDomain =
    payload.primaryDomain && typeof payload.primaryDomain === "object" ? payload.primaryDomain : null;
  const domains = Array.isArray(payload.domains) ? payload.domains : [];

  return {
    site,
    primaryDomain,
    domains,
    isReachable: Boolean(payload.isReachable),
  };
};
