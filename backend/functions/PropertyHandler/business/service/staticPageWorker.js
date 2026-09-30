import { buildStaticPageKey } from "../../data/repository/staticPageStore.js";
import { resolveDirectBookingWebsiteFallbackDomainStatus } from "../../util/directBookingWebsiteRouting.js";

const DEFAULT_RUN_LIMIT = 20;
const SITE_STATUS_PUBLISHED = "PUBLISHED";
const DOMAIN_STATUS_ACTIVE = "ACTIVE";

class PageBuildFailure extends Error {
  constructor(code, cause) {
    super(cause ? `${code}: ${cause.message || cause}` : code);
    this.code = code;
  }
}

const failWith = (code) => (cause) => {
  throw new PageBuildFailure(code, cause);
};

const isActiveDomain = (domain) => resolveDirectBookingWebsiteFallbackDomainStatus(domain) === DOMAIN_STATUS_ACTIVE;

const pickPrimaryDomain = (domains) => domains.find((domain) => domain.isPrimary) || domains[0];

const emptySummary = (listed) => ({
  listed,
  built: 0,
  skipped: 0,
  superseded: 0,
  notClaimed: 0,
  failed: 0,
  errors: [],
});

export class StaticPageWorker {
  constructor({ outboxRepository, siteRepository, domainRepository, pageStore, renderer }) {
    this.outboxRepository = outboxRepository;
    this.siteRepository = siteRepository;
    this.domainRepository = domainRepository;
    this.pageStore = pageStore;
    this.renderer = renderer;
  }

  async run({ limit = DEFAULT_RUN_LIMIT } = {}) {
    const template = await this.pageStore.readAppShell();
    const jobs = await this.outboxRepository.listPagesToBuild({ limit });
    const summary = emptySummary(jobs.length);

    for (const job of jobs) {
      try {
        const outcome = await this.#buildPage(job, template);
        summary[outcome] += 1;
      } catch (error) {
        console.error(`[StaticPageWorker] site ${job.siteId} revision ${job.revision} was not finished:`, error);
        summary.errors.push({ siteId: job.siteId, revision: job.revision, message: error.message });
      }
    }

    return summary;
  }

  async #buildPage(job, template) {
    const claimed = await this.outboxRepository.claimPage(job.siteId, job.revision);
    if (!claimed) {
      return "notClaimed";
    }

    const site = await this.siteRepository.getSiteById(job.siteId);
    if (!site) {
      await this.outboxRepository.skipPage(job.siteId, job.revision, "SITE_NOT_FOUND");
      return "skipped";
    }
    if (site.status !== SITE_STATUS_PUBLISHED) {
      await this.outboxRepository.skipPage(job.siteId, job.revision, "SITE_NOT_PUBLISHED");
      return "skipped";
    }
    if (site.staticPageRevision !== job.revision) {
      return "superseded";
    }

    try {
      const domains = await this.#activeDomains(site.id);
      const html = await this.renderer
        .render({ template, site, domain: pickPrimaryDomain(domains) })
        .catch(failWith("RENDER_FAILED"));
      await this.#upload(site, job.revision, domains, html);
    } catch (error) {
      if (!(error instanceof PageBuildFailure)) {
        throw error;
      }
      await this.outboxRepository.markPageFailed(job.siteId, job.revision, error.message);
      return "failed";
    }

    const active = await this.outboxRepository.markPageActive(job.siteId, job.revision);
    if (active) {
      return "built";
    }

    await this.outboxRepository.requeueNewerRevision(job.siteId, job.revision);
    return "superseded";
  }

  async #activeDomains(siteId) {
    const domains = (await this.domainRepository.listDomainsBySiteId(siteId)).filter(isActiveDomain);
    if (domains.length === 0) {
      throw new PageBuildFailure("NO_ACTIVE_DOMAIN");
    }

    try {
      domains.forEach((domain) => buildStaticPageKey(domain.domain));
    } catch (error) {
      throw new PageBuildFailure("INVALID_DOMAIN", error);
    }

    return domains;
  }

  async #upload(site, revision, domains, html) {
    for (const domain of domains) {
      await this.pageStore
        .putPage({ hostname: domain.domain, html, siteId: site.id, revision })
        .catch(failWith("S3_PUT_FAILED"));
    }
  }
}

export default StaticPageWorker;
