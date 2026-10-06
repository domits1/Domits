import { resolveDirectBookingWebsiteRuntimeDomainStatus } from "../../util/directBookingWebsiteRouting.js";
import {
  STATIC_PAGE_ATTEMPT_LIMIT,
  STATIC_PAGE_BUILD_LEASE_MS,
} from "../../data/repository/staticPageOutboxRepository.js";

const DEFAULT_RUN_LIMIT = 50;
const MAX_RUN_LIMIT = 200;
const TRANSIENT_CONFLICT_CODES = new Set(["40001", "OC001"]);

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

const isStuck = (row, now) =>
  Boolean(row) &&
  row.attemptCount >= STATIC_PAGE_ATTEMPT_LIMIT &&
  (row.status === "FAILED" || (row.status === "BUILDING" && row.updatedAt < now - STATIC_PAGE_BUILD_LEASE_MS));

const isWorkingOnItsOwn = (row, now) =>
  Boolean(row) && !isStuck(row, now) && ["PENDING", "BUILDING", "FAILED"].includes(row.status);

const isTransientConflict = (error) =>
  TRANSIENT_CONFLICT_CODES.has(String(error?.code || error?.driverError?.code || ""));

export class StaticPageReconciler {
  constructor({ pageStore, siteRepository, domainRepository, outboxRepository, withdrawal }) {
    this.pageStore = pageStore;
    this.siteRepository = siteRepository;
    this.domainRepository = domainRepository;
    this.outboxRepository = outboxRepository;
    this.withdrawal = withdrawal;
  }

  async run({ limit, now = Date.now() } = {}) {
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
    const repairs = new Set();
    if (orphans.length > 0) {
      const removal = await this.withdrawal.removePages(orphans, {
        etags: listed.etags,
        keep: async (hostname) =>
          isPublishedOnActiveDomain(await this.domainRepository.getDomainWithSiteByName(hostname)),
      });
      summary.removed = removal.removed.length;
      summary.errors.push(...removal.failures, ...removal.invalidationErrors);
      for (const hostname of removal.removed) {
        const owner = await this.domainRepository.getDomainWithSiteByName(hostname);
        if (isPublishedOnActiveDomain(owner)) {
          repairs.add(owner.siteId);
        }
      }
    }

    const siteIdsMissingAPage = [
      ...new Set([
        ...repairs,
        ...expected.filter((entry) => !storedHostnames.has(entry.domain)).map((entry) => entry.siteId),
      ]),
    ];
    const rows = await this.outboxRepository.listPagesBySiteIds(siteIdsMissingAPage);
    const rowBySiteId = new Map(rows.map((row) => [row.siteId, row]));
    const toQueue = [];
    for (const siteId of siteIdsMissingAPage) {
      const row = rowBySiteId.get(siteId);
      if (repairs.has(siteId)) {
        toQueue.push(siteId);
      } else if (isStuck(row, now)) {
        summary.stuck.push({ siteId, status: row.status, failureReason: row.failureReason });
      } else if (!isWorkingOnItsOwn(row, now)) {
        toQueue.push(siteId);
      }
    }
    for (const siteId of toQueue.slice(0, budget)) {
      try {
        if (await this.siteRepository.queueStaticPage(siteId, { evenWhileBusy: repairs.has(siteId) })) {
          summary.queued += 1;
        }
      } catch (error) {
        if (!isTransientConflict(error)) {
          summary.errors.push({ siteId, message: error.message });
        }
      }
    }

    return summary;
  }
}

export default StaticPageReconciler;
