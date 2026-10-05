import { resolveDirectBookingWebsiteRuntimeDomainStatus } from "../../util/directBookingWebsiteRouting.js";
import { STATIC_PAGE_ATTEMPT_LIMIT } from "../../data/repository/staticPageOutboxRepository.js";

const DEFAULT_RUN_LIMIT = 50;
const ROW_STATUSES_IN_PROGRESS = new Set(["PENDING", "BUILDING"]);

const isPublishedOnActiveDomain = (entry) =>
  entry.site.status === "PUBLISHED" && resolveDirectBookingWebsiteRuntimeDomainStatus(entry.site, entry) === "ACTIVE";

const willRetryOnItsOwn = (row) =>
  Boolean(row) &&
  (ROW_STATUSES_IN_PROGRESS.has(row.status) ||
    (row.status === "FAILED" && row.attemptCount < STATIC_PAGE_ATTEMPT_LIMIT));

const isStuck = (row) => Boolean(row) && row.status === "FAILED" && row.attemptCount >= STATIC_PAGE_ATTEMPT_LIMIT;

export class StaticPageReconciler {
  constructor({ pageStore, siteRepository, domainRepository, outboxRepository, withdrawal }) {
    this.pageStore = pageStore;
    this.siteRepository = siteRepository;
    this.domainRepository = domainRepository;
    this.outboxRepository = outboxRepository;
    this.withdrawal = withdrawal;
  }

  async run({ limit = DEFAULT_RUN_LIMIT } = {}) {
    const storedHostnames = new Set(await this.pageStore.listPageHostnames());
    const entries = await this.domainRepository.listDomainsWithSites();
    const expected = entries.filter(isPublishedOnActiveDomain);
    const expectedHostnames = new Set(expected.map((entry) => entry.domain));
    const summary = {
      stored: storedHostnames.size,
      expected: expectedHostnames.size,
      removed: 0,
      queued: 0,
      stuck: [],
      errors: [],
    };

    const orphans = [...storedHostnames].filter((hostname) => !expectedHostnames.has(hostname)).slice(0, limit);
    for (const hostname of orphans) {
      try {
        const { invalidationErrors } = await this.withdrawal.withdraw({ siteId: "", domains: [{ domain: hostname }] });
        summary.removed += 1;
        summary.errors.push(...invalidationErrors.map((failure) => ({ hostname, message: failure.message })));
      } catch (error) {
        summary.errors.push({ hostname, message: error.message });
      }
    }

    const siteIdsMissingAPage = [
      ...new Set(expected.filter((entry) => !storedHostnames.has(entry.domain)).map((entry) => entry.siteId)),
    ].slice(0, limit);
    const rows = await this.outboxRepository.listPagesBySiteIds(siteIdsMissingAPage);
    const rowBySiteId = new Map(rows.map((row) => [row.siteId, row]));
    for (const siteId of siteIdsMissingAPage) {
      const row = rowBySiteId.get(siteId);
      if (isStuck(row)) {
        summary.stuck.push({ siteId, failureReason: row.failureReason });
        continue;
      }
      if (willRetryOnItsOwn(row)) {
        continue;
      }
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
