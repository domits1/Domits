const cleanWebsiteText = (value) => String(value || "").replaceAll(/\s+/g, " ").trim();

const trimRepeatedCharacterEdges = (value, character) => {
  let startIndex = 0;
  let endIndex = value.length;

  while (startIndex < endIndex && value[startIndex] === character) {
    startIndex += 1;
  }

  while (endIndex > startIndex && value[endIndex - 1] === character) {
    endIndex -= 1;
  }

  return value.slice(startIndex, endIndex);
};

const normalizeStandaloneSiteDomainInput = (value) => {
  const normalizedValue = cleanWebsiteText(value).toLowerCase();
  if (!normalizedValue) {
    return "";
  }

  const withoutProtocol = normalizedValue.replace(/^https?:\/\//, "");
  const hostSegment = withoutProtocol.split("/")[0] || "";
  return hostSegment.split(":")[0] || "";
};

const usesManagedStandaloneSiteSuffix = (domain, suffix) =>
  domain === suffix || domain.endsWith(`.${suffix}`);

export class StandaloneSiteCustomDomainService {
  constructor({
    standaloneSiteRepository,
    standaloneSiteDomainRepository,
    getManagedDomainSuffix,
  }) {
    this.standaloneSiteRepository = standaloneSiteRepository;
    this.standaloneSiteDomainRepository = standaloneSiteDomainRepository;
    this.getManagedDomainSuffix = getManagedDomainSuffix;
  }

  selectPrimaryDomain(domains = []) {
    const normalizedDomains = Array.isArray(domains) ? domains : [];
    return (
      normalizedDomains.find((domainEntry) => domainEntry?.isPrimary) ||
      normalizedDomains[0] ||
      null
    );
  }

  buildSiteSummary(site, domains = []) {
    if (!site) {
      return null;
    }

    const normalizedDomains = Array.isArray(domains) ? domains : [];
    const primaryDomain = this.selectPrimaryDomain(normalizedDomains);
    const isReachable = site.status === "PUBLISHED" && primaryDomain?.status === "ACTIVE";

    return {
      site,
      primaryDomain,
      domains: normalizedDomains,
      isReachable,
    };
  }

  normalizeCustomDomain(domainInput) {
    const normalizedDomain = trimRepeatedCharacterEdges(
      normalizeStandaloneSiteDomainInput(domainInput),
      "."
    );
    if (!normalizedDomain) {
      throw new TypeError("Custom domain is required.");
    }

    if (normalizedDomain.includes("*")) {
      throw new TypeError("Custom domain wildcards are not supported.");
    }

    if (normalizedDomain.length > 253) {
      throw new TypeError("Custom domain is too long.");
    }

    const labels = normalizedDomain.split(".");
    if (labels.length < 3) {
      throw new TypeError("Custom domain must use a subdomain like stay.example.com.");
    }

    for (const currentLabel of labels) {
      if (!currentLabel) {
        throw new TypeError("Custom domain must be a valid hostname.");
      }

      if (currentLabel.length > 63) {
        throw new TypeError("Custom domain contains a label that is too long.");
      }

      if (!/^[a-z0-9-]+$/.test(currentLabel) || currentLabel.startsWith("-") || currentLabel.endsWith("-")) {
        throw new TypeError("Custom domain must be a valid hostname.");
      }
    }

    return normalizedDomain;
  }

  ensureCustomDomainEligibility({ requestedDomain, fallbackDomain }) {
    const managedDomainSuffix = String(this.getManagedDomainSuffix?.() || "").trim().toLowerCase();
    if (managedDomainSuffix && usesManagedStandaloneSiteSuffix(requestedDomain, managedDomainSuffix)) {
      throw new TypeError("Custom domain cannot use the Domits live-link suffix.");
    }

    if (requestedDomain === String(fallbackDomain || "").trim().toLowerCase()) {
      throw new TypeError("Custom domain must be different from the Domits live link.");
    }
  }

  buildVerificationDetails({ requestedDomain, fallbackDomain }) {
    return {
      activationMode: "custom",
      domainKind: "custom",
      setupStatus: "REQUESTED",
      requestedDomain,
      fallbackDomain,
      requestedAt: Date.now(),
      supportsApexDomain: false,
      recommendedRecordType: "CNAME",
      recommendedUsage: "Use a subdomain you control, such as stay.example.com.",
      nextAction:
        "Domits still needs to verify routing and certificate readiness before this domain can replace the fallback live link.",
    };
  }

  mergeVerificationDetails(currentDetails = {}, nextDetails = {}) {
    const normalizedCurrentDetails =
      currentDetails && typeof currentDetails === "object" && !Array.isArray(currentDetails)
        ? currentDetails
        : {};
    const normalizedNextDetails =
      nextDetails && typeof nextDetails === "object" && !Array.isArray(nextDetails)
        ? nextDetails
        : {};

    return {
      ...normalizedCurrentDetails,
      ...normalizedNextDetails,
    };
  }

  buildRecheckVerificationDetails(customDomain, fallbackDomain) {
    return this.mergeVerificationDetails(customDomain?.verificationDetails, {
      setupStatus: "VERIFIED",
      verificationMode: "manual_recheck",
      verifiedAt: Date.now(),
      fallbackDomain,
      nextAction:
        "Custom domain is ready for activation. The Domits live link can remain online as a secondary fallback.",
    });
  }

  buildActiveVerificationDetails(customDomain, fallbackDomain) {
    return this.mergeVerificationDetails(customDomain?.verificationDetails, {
      setupStatus: "ACTIVE",
      activationStatus: "ACTIVE",
      activatedAt: Date.now(),
      fallbackDomain,
      nextAction:
        "Custom domain is active. The Domits live link remains available as a secondary fallback.",
    });
  }

  buildDeactivatedVerificationDetails(customDomain, fallbackDomain) {
    return this.mergeVerificationDetails(customDomain?.verificationDetails, {
      setupStatus: "VERIFIED",
      activationStatus: "DEACTIVATED",
      deactivatedAt: Date.now(),
      fallbackDomain,
      nextAction:
        "Custom domain was deactivated. You can reactivate it after the final routing checks are complete.",
    });
  }

  async getPublishedSiteWithDomains({ propertyId, hostId }) {
    const site = await this.standaloneSiteRepository.getSiteByPropertyIdAndHostId(propertyId, hostId);
    if (!site || site.status !== "PUBLISHED") {
      throw new TypeError("Publish the live site before managing a custom domain.");
    }

    const fallbackDomain = await this.standaloneSiteDomainRepository.getFallbackDomainBySiteId(site.id);
    if (!fallbackDomain?.domain) {
      throw new TypeError("Publish the live site before managing a custom domain.");
    }

    return {
      site,
      fallbackDomain,
      customDomain: await this.standaloneSiteDomainRepository.getCustomDomainBySiteId(site.id),
    };
  }

  async requestCustomDomain({ propertyId, hostId, requestedDomain }) {
    const { site, fallbackDomain, customDomain: existingCustomDomain } =
      await this.getPublishedSiteWithDomains({ propertyId, hostId });

    const normalizedCustomDomain = this.normalizeCustomDomain(requestedDomain);
    this.ensureCustomDomainEligibility({
      requestedDomain: normalizedCustomDomain,
      fallbackDomain: fallbackDomain.domain,
    });

    const existingDomain = await this.standaloneSiteDomainRepository.getDomainByName(normalizedCustomDomain);
    if (existingDomain && existingDomain.siteId !== site.id) {
      throw new TypeError("Custom domain is already linked to another website.");
    }

    const requestedCustomDomain = await this.standaloneSiteDomainRepository.upsertCustomDomainForSite({
      siteId: site.id,
      domain: normalizedCustomDomain,
      status: "PENDING",
      isPrimary: false,
      verificationDetails: this.buildVerificationDetails({
        requestedDomain: normalizedCustomDomain,
        fallbackDomain: fallbackDomain.domain,
      }),
    });

    if (existingCustomDomain?.isPrimary === true || existingCustomDomain?.status === "ACTIVE") {
      await this.standaloneSiteDomainRepository.setOnlyPrimaryDomain(site.id, fallbackDomain.id);
    }

    const allDomains = await this.standaloneSiteDomainRepository.listDomainsBySiteId(site.id);
    return {
      site,
      customDomain: requestedCustomDomain,
      fallbackDomain,
      siteSummary: this.buildSiteSummary(site, allDomains),
    };
  }

  async recheckCustomDomain({ propertyId, hostId }) {
    const { site, fallbackDomain, customDomain } = await this.getPublishedSiteWithDomains({ propertyId, hostId });
    if (!customDomain?.domain) {
      throw new TypeError("Request a custom domain before rechecking setup.");
    }

    const verifiedCustomDomain = await this.standaloneSiteDomainRepository.verifyCustomDomainBySiteId(
      site.id,
      this.buildRecheckVerificationDetails(customDomain, fallbackDomain.domain)
    );
    const allDomains = await this.standaloneSiteDomainRepository.listDomainsBySiteId(site.id);

    return {
      site,
      customDomain: verifiedCustomDomain,
      fallbackDomain,
      siteSummary: this.buildSiteSummary(site, allDomains),
    };
  }

  async activateCustomDomain({ propertyId, hostId }) {
    const { site, fallbackDomain, customDomain } = await this.getPublishedSiteWithDomains({ propertyId, hostId });
    if (!customDomain?.domain) {
      throw new TypeError("Request a custom domain before activating it.");
    }

    if (String(customDomain.status || "").trim().toUpperCase() !== "VERIFIED") {
      throw new TypeError("Recheck the custom domain before activating it.");
    }

    const activeCustomDomain = await this.standaloneSiteDomainRepository.activateCustomDomainBySiteId(
      site.id,
      this.buildActiveVerificationDetails(customDomain, fallbackDomain.domain)
    );
    const allDomains = await this.standaloneSiteDomainRepository.listDomainsBySiteId(site.id);

    return {
      site,
      customDomain: activeCustomDomain,
      fallbackDomain,
      siteSummary: this.buildSiteSummary(site, allDomains),
    };
  }

  async deactivateCustomDomain({ propertyId, hostId }) {
    const { site, fallbackDomain, customDomain } = await this.getPublishedSiteWithDomains({ propertyId, hostId });
    if (!customDomain?.domain) {
      throw new TypeError("Request a custom domain before deactivating it.");
    }

    if (String(customDomain.status || "").trim().toUpperCase() !== "ACTIVE") {
      throw new TypeError("Custom domain is not active yet.");
    }

    const verifiedCustomDomain = await this.standaloneSiteDomainRepository.deactivateCustomDomainBySiteId(
      site.id,
      this.buildDeactivatedVerificationDetails(customDomain, fallbackDomain.domain)
    );
    const allDomains = await this.standaloneSiteDomainRepository.listDomainsBySiteId(site.id);

    return {
      site,
      customDomain: verifiedCustomDomain,
      fallbackDomain,
      siteSummary: this.buildSiteSummary(site, allDomains),
    };
  }
}
