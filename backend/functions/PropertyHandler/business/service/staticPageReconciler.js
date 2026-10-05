import { resolveDirectBookingWebsiteRuntimeDomainStatus } from "../../util/directBookingWebsiteRouting.js";
import { STATIC_PAGE_ATTEMPT_LIMIT } from "../../data/repository/staticPageOutboxRepository.js";

const DEFAULT_RUN_LIMIT = 50;
const MAX_RUN_LIMIT = 200;

const normalizeLimit = (limit) => {
  const normalized = Number(limit);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    return DEFAULT_RUN_LIMIT;
  }

  return Math.min(normalized, MAX_RUN_LIMIT);
};

const isPublishedOnActiveDomain = (entry) =>
  Boolean(entry) &&
  entry.site.status === "PUBLISHED" &&
  resolveDirectBookingWebsiteRuntimeDomainStatus(entry.site, entry) === "ACTIVE";

const isExhausted = (row) => Boolean(row) && row.attemptCount >= STATIC_PAGE_ATTEMPT_LIMIT;

const isWorkingOnItsOwn = (row) =>
  Boolean(row) && !isExhausted(row) && ["PENDING", "BUILDING", "FAILED"].includes(row.status);

export class StaticPageReconciler {
  constructor({ pageStore, siteRepository, domainRepository, outboxRepository, withdrawal }) {
    this.pageStore = pageStore;
    this.siteRepository = siteRepository;
    this.domainRepository = domainRepository;
    this.outboxRepository = outboxRepository;
    this.withdrawal = withdrawal;
  }

  async run({ limit } = {}) {
    const budget = normalizeLimit(limit);
    const listed = await this.pageStore.listPageHostnames();
    const entries = await this.domainRepository.listDomainsWithSites();
    const expected = entries.filter(isPublishedOnActiveDomain);
    const expectedHostnames = new Set(expected.map((entry) => entry.domain));
    const storedHostnames = new Set(listed.hostnames);
    const summary = {
      stored: storedHostnames.size,
      expected: expectedHostnames.size,
      removed: 0,
      queued: 0,
      stuck: [],
      errors: listed.rejected.map((key) => ({ key, message: "not a page key" })),
    };

    const orphans = [...storedHostnames].filter((hostname) => !expectedHostnames.has(hostname)).slice(0, budget);
    const removable = [];
    for (const hostname of orphans) {
      try {
        if (isPublishedOnActiveDomain(await this.domainRepository.getDomainWithSiteByName(hostname))) {
          continue;
        }
        removable.push(hostname);
      } catch (error) {
        summary.errors.push({ hostname, message: error.message });
      }
    }
    if (removable.length > 0) {
      const removal = await this.withdrawal.removePages(removable);
      summary.removed = removal.removed.length;
      summary.errors.push(...removal.failures, ...removal.invalidationErrors);
    }

    const siteIdsMissingAPage = [
      ...new Set(expected.filter((entry) => !storedHostnames.has(entry.domain)).map((entry) => entry.siteId)),
    ];
    const rows = await this.outboxRepository.listPagesBySiteIds(siteIdsMissingAPage);
    const rowBySiteId = new Map(rows.map((row) => [row.siteId, row]));
    const toQueue = [];
    for (const siteId of siteIdsMissingAPage) {
      const row = rowBySiteId.get(siteId);
      if (isExhausted(row)) {
        summary.stuck.push({ siteId, status: row.status, failureReason: row.failureReason });
      } else if (!isWorkingOnItsOwn(row)) {
        toQueue.push(siteId);
      }
    }
    for (const siteId of toQueue.slice(0, budget)) {
      try {
        if (await this.siteRepository.queueStaticPage(siteId)) {
          summary.queued += 1;
        }
      } catch (error) {
        summary.errors.push({ siteId, message: error.message });
      }
    }

    return summary;
  }
}

export default StaticPageReconciler;
