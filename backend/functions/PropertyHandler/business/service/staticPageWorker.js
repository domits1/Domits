import { buildStaticPageKey } from "../../data/repository/staticPageStore.js";
import {
  resolveDirectBookingWebsiteRuntimeDomainStatus,
  selectDirectBookingWebsiteMainAddress,
} from "../../util/directBookingWebsiteRouting.js";

const DEFAULT_RUN_LIMIT = 20;

class PageBuildFailure extends Error {
  constructor(code, cause) {
    super(cause ? `${code}: ${cause.message || cause}` : code);
    this.code = code;
  }
}

const failWith = (code) => (cause) => {
  throw new PageBuildFailure(code, cause);
};

const withEffectiveStatus = (site) => (domain) => ({
  ...domain,
  status: resolveDirectBookingWebsiteRuntimeDomainStatus(site, domain),
});

export class StaticPageWorker {
  constructor({ outboxRepository, siteRepository, domainRepository, pageStore, renderer, withdrawal }) {
    this.outboxRepository = outboxRepository;
    this.siteRepository = siteRepository;
    this.domainRepository = domainRepository;
    this.pageStore = pageStore;
    this.renderer = renderer;
    this.withdrawal = withdrawal;
  }

  async run({ limit = DEFAULT_RUN_LIMIT } = {}) {
    const jobs = await this.outboxRepository.listPagesToBuild({ limit });
    const summary = {
      listed: jobs.length,
      built: 0,
      withdrawn: 0,
      skipped: 0,
      superseded: 0,
      notClaimed: 0,
      failed: 0,
      errors: [],
    };

    for (const job of jobs) {
      try {
        const { outcome, errors = [] } = await this.#buildPage(job);
        summary[outcome] += 1;
        summary.errors.push(...errors);
      } catch (error) {
        console.error(`[StaticPageWorker] site ${job.siteId} revision ${job.revision} was not finished:`, error);
        summary.errors.push({ siteId: job.siteId, revision: job.revision, message: error.message });
      }
    }

    return summary;
  }

  async #buildPage(job) {
    const template = await this.pageStore.readAppShell();
    const claimed = await this.outboxRepository.claimPage(job.siteId, job.revision);
    if (!claimed) {
      return { outcome: "notClaimed" };
    }

    const site = await this.siteRepository.getSiteById(job.siteId);
    if (!site) {
      return this.#record(job, "skipped", () =>
        this.outboxRepository.skipPage(job.siteId, job.revision, "SITE_NOT_FOUND")
      );
    }
    if (site.staticPageRevision !== job.revision) {
      return this.#record(job, "superseded", async () => false);
    }
    if (site.status !== "PUBLISHED") {
      return this.#withdrawPage(job, site);
    }

    try {
      const domains = await this.#loadDomains(site);
      const activeDomains = this.#activeDomains(domains);
      const html = await this.renderer
        .render({
          template,
          site,
          mainAddress: selectDirectBookingWebsiteMainAddress(site, domains),
          destination: activeDomains[0],
        })
        .catch(failWith("RENDER_FAILED"));
      await this.#upload(site, job.revision, activeDomains, html);
    } catch (error) {
      if (!(error instanceof PageBuildFailure)) {
        throw error;
      }
      return this.#record(job, "failed", () =>
        this.outboxRepository.markPageFailed(job.siteId, job.revision, error.message)
      );
    }

    return this.#record(job, "built", () => this.outboxRepository.markPageActive(job.siteId, job.revision));
  }

  async #withdrawPage(job, site) {
    let result;
    try {
      result = await this.withdrawal
        .withdraw({ siteId: site.id, domains: await this.domainRepository.listDomainsBySiteId(site.id) })
        .catch(failWith("S3_DELETE_FAILED"));
    } catch (error) {
      if (!(error instanceof PageBuildFailure)) {
        throw error;
      }
      return this.#record(job, "failed", () =>
        this.outboxRepository.markPageFailed(job.siteId, job.revision, error.message)
      );
    }

    const errors = result.invalidationErrors.map((failure) => ({
      siteId: site.id,
      revision: job.revision,
      message: `INVALIDATION_FAILED: ${failure.hostname || failure.tenantId}: ${failure.message}`,
    }));
    return this.#record(
      job,
      "withdrawn",
      () => this.outboxRepository.markPageWithdrawn(job.siteId, job.revision),
      errors
    );
  }

  async #record(job, outcome, write, errors = []) {
    if (await write()) {
      return { outcome, errors };
    }

    await this.outboxRepository.requeueNewerRevision(job.siteId, job.revision);
    return { outcome: "superseded", errors };
  }

  async #loadDomains(site) {
    return (await this.domainRepository.listDomainsBySiteId(site.id)).map(withEffectiveStatus(site));
  }

  #activeDomains(allDomains) {
    const domains = allDomains.filter((domain) => domain.status === "ACTIVE");
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
