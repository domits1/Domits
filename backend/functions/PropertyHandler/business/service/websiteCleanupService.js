const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const TAKE_DOWN_REASON = "property_not_active";

const normalizeLimit = (limit) => {
  const normalized = Number(limit);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(normalized, MAX_LIMIT);
};

export class WebsiteCleanupService {
  constructor({ siteRepository, propertyRepository, unpublisher }) {
    this.siteRepository = siteRepository;
    this.propertyRepository = propertyRepository;
    this.unpublisher = unpublisher;
  }

  async unpublishSitesOfInactiveListings({ apply, limit } = {}) {
    const shouldApply = apply === true;
    const { sites: candidates, truncated } = await this.siteRepository.listPublishedSitesOfInactiveProperties({
      limit: normalizeLimit(limit),
    });
    const summary = {
      mode: shouldApply ? "apply" : "dry-run",
      candidates: candidates.length,
      unpublished: 0,
      skipped: 0,
      errors: [],
      truncated,
      sites: [],
    };

    for (const candidate of candidates) {
      const entry = {
        siteId: candidate.id,
        propertyId: candidate.propertyId,
        propertyStatus: candidate.propertyStatus ?? "MISSING",
      };

      if (!shouldApply) {
        summary.sites.push({ ...entry, outcome: "would-unpublish" });
        continue;
      }

      try {
        const outcome = await this.#unpublishIfStillInactive(candidate.id);
        summary[outcome === "unpublished" ? "unpublished" : "skipped"] += 1;
        summary.sites.push({ ...entry, outcome });
      } catch (error) {
        summary.errors.push({ siteId: candidate.id, message: error?.message || String(error) });
        summary.sites.push({ ...entry, outcome: "failed" });
      }
    }

    return summary;
  }

  async #unpublishIfStillInactive(siteId) {
    const site = await this.siteRepository.getSiteById(siteId);
    if (site?.status !== "PUBLISHED") {
      return "skipped";
    }

    const property = await this.propertyRepository.getPropertyById(site.propertyId);
    if (property?.status === "ACTIVE") {
      return "skipped";
    }

    await this.unpublisher.takeDown({
      site,
      hostId: site.hostId,
      propertyId: site.propertyId,
      reason: TAKE_DOWN_REASON,
    });
    return "unpublished";
  }
}

export default WebsiteCleanupService;
