import { randomUUID } from "node:crypto";
import { buildStaticPageKey } from "../../data/repository/staticPageStore.js";

const DISTRIBUTION_ENV_NAME = "DIRECT_BOOKING_WEBSITE_CLOUDFRONT_DISTRIBUTION_ID";

const parentOf = (hostname) => hostname.split(".").slice(1).join(".");

const pathsFor = (hostname) => ["/" + buildStaticPageKey(hostname), "/", "/index.html"];

export class StaticPageWithdrawal {
  constructor({ pageStore, tenantRepository, distributionId = process.env[DISTRIBUTION_ENV_NAME] }) {
    this.pageStore = pageStore;
    this.tenantRepository = tenantRepository;
    this.distributionId = String(distributionId || "").trim();
  }

  async withdraw({ siteId, domains }) {
    const hostnames = [...new Set(domains.map((domain) => domain?.domain).filter(Boolean))];
    hostnames.forEach((hostname) => buildStaticPageKey(hostname));
    for (const hostname of hostnames) {
      await this.pageStore.deletePage({ hostname });
    }

    return { siteId, hostnames, invalidationErrors: await this.#invalidate(hostnames) };
  }

  async #invalidate(hostnames) {
    const errors = [];
    const pathsByTenant = new Map();
    let wildcardTenants = null;
    for (const hostname of hostnames) {
      try {
        wildcardTenants ??= await this.#wildcardTenants();
        const tenantId = await this.#tenantIdFor(hostname, wildcardTenants);
        if (!tenantId) {
          errors.push({ hostname, message: "no tenant serves this hostname" });
          continue;
        }
        pathsByTenant.set(tenantId, [...(pathsByTenant.get(tenantId) || []), ...pathsFor(hostname)]);
      } catch (error) {
        errors.push({ hostname, message: error.message });
      }
    }

    for (const [tenantId, paths] of pathsByTenant) {
      try {
        await this.tenantRepository.createInvalidation({
          tenantId,
          paths: [...new Set(paths)],
          callerReference: `withdraw-${randomUUID()}`,
        });
      } catch (error) {
        errors.push({ tenantId, message: error.message });
      }
    }

    return errors;
  }

  async #wildcardTenants() {
    if (!this.distributionId) {
      return [];
    }

    return (await this.tenantRepository.listTenantsForDistribution(this.distributionId)).flatMap((tenant) =>
      tenant.domains
        .filter((domain) => domain.startsWith("*."))
        .map((domain) => ({ id: tenant.id, parent: domain.slice(2) }))
    );
  }

  async #tenantIdFor(hostname, wildcardTenants) {
    const exact = await this.tenantRepository.getTenantByDomain(hostname);
    if (exact?.id) {
      return exact.id;
    }

    return wildcardTenants.find((tenant) => tenant.parent === parentOf(hostname))?.id || "";
  }
}

export default StaticPageWithdrawal;
