import { getDirectBookingWebsiteFallbackDomainSuffix } from "../../util/directBookingWebsiteRouting.js";
import {
  WEBSITE_CUSTOM_DOMAIN_ERROR_CODES,
  WebsiteCustomDomainError,
} from "../../util/exception/WebsiteCustomDomainError.js";

const DOMAIN_TYPE_CUSTOM = "CUSTOM";
const DOMAIN_STATUS = Object.freeze({
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
  ACTIVE: "ACTIVE",
  FAILED: "FAILED",
  DISABLED: "DISABLED",
  REMOVING: "REMOVING",
});
const HOSTNAME_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const HOSTNAME_MAX_LENGTH = 253;
const MINIMUM_LABEL_COUNT = 3;
const TENANT_NAME_PREFIX = "dbw-";
const CERTIFICATE_STATUS_ISSUED = "issued";
const CERTIFICATE_STATUS_PENDING = "pending-validation";
const FAILED_CERTIFICATE_STATUSES = new Set(["validation-timed-out", "failed", "revoked", "expired"]);
const CLOUDFRONT_DOMAIN_STATUS_ACTIVE = "active";
const CLOUDFRONT_TENANT_STATUS_DEPLOYED = "Deployed";
const REASON_REMOVAL_REQUESTED = "removal_requested";
const EVENT_DOMAIN_REMOVED = "SITE_DOMAIN_REMOVED";
const DNS_STATUS_VALID = "valid-configuration";
const SDK_ERROR_DOMAIN_IN_USE = "CNAMEAlreadyExists";
const SDK_ERROR_TENANT_NAME_EXISTS = "EntityAlreadyExists";
const EVENT_DOMAIN_REQUESTED = "SITE_DOMAIN_REQUESTED";
const EVENT_TYPE_BY_STATUS = Object.freeze({
  [DOMAIN_STATUS.VERIFIED]: "SITE_DOMAIN_VERIFIED",
  [DOMAIN_STATUS.ACTIVE]: "SITE_DOMAIN_ACTIVATED",
  [DOMAIN_STATUS.FAILED]: "SITE_DOMAIN_FAILED",
});
const CONFIG_ENV_NAMES = Object.freeze({
  distributionId: "DIRECT_BOOKING_WEBSITE_CLOUDFRONT_DISTRIBUTION_ID",
  connectionGroupId: "DIRECT_BOOKING_WEBSITE_CLOUDFRONT_CONNECTION_GROUP_ID",
  routingEndpoint: "DIRECT_BOOKING_WEBSITE_CLOUDFRONT_ROUTING_ENDPOINT",
});

export const resolveWebsiteCustomDomainConfigFromEnv = () =>
  Object.fromEntries(
    Object.entries(CONFIG_ENV_NAMES).map(([key, envName]) => [key, String(process.env[envName] || "").trim()])
  );

const assertConfig = (config) => {
  for (const [key, envName] of Object.entries(CONFIG_ENV_NAMES)) {
    if (!config?.[key]) {
      throw new TypeError(`Missing custom domain configuration: ${envName}.`);
    }
  }
};

export const normalizeWebsiteCustomDomain = (domain) => {
  const normalizedDomain = String(domain || "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");
  const labels = normalizedDomain.split(".");
  const fallbackSuffix = getDirectBookingWebsiteFallbackDomainSuffix();
  const isWellFormed =
    normalizedDomain.length <= HOSTNAME_MAX_LENGTH &&
    labels.length >= MINIMUM_LABEL_COUNT &&
    labels.every((label) => HOSTNAME_LABEL_PATTERN.test(label));
  const isReservedSuffix = normalizedDomain === fallbackSuffix || normalizedDomain.endsWith(`.${fallbackSuffix}`);

  if (!isWellFormed || isReservedSuffix) {
    throw new WebsiteCustomDomainError(
      WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.INVALID_DOMAIN,
      "Custom domain must be a subdomain such as www.example.com and cannot use the Domits fallback suffix."
    );
  }

  return normalizedDomain;
};

const findTenantDomainStatus = (tenant, domain) =>
  (tenant?.domains || []).find((domainEntry) => domainEntry.domain === domain)?.status || "";

export const mapCloudFrontStateToDomainStatus = ({ tenant, certificate, domain, currentStatus }) => {
  if (!tenant) {
    return { status: DOMAIN_STATUS.FAILED, reason: "tenant_not_found" };
  }
  if (!tenant.enabled) {
    return { status: DOMAIN_STATUS.DISABLED, reason: "tenant_disabled" };
  }
  const certificateStatus = certificate?.status || "";
  if (FAILED_CERTIFICATE_STATUSES.has(certificateStatus)) {
    return { status: DOMAIN_STATUS.FAILED, reason: `certificate_${certificateStatus}` };
  }
  if (findTenantDomainStatus(tenant, domain) === CLOUDFRONT_DOMAIN_STATUS_ACTIVE) {
    return { status: DOMAIN_STATUS.ACTIVE, reason: "domain_active" };
  }
  if (certificateStatus === CERTIFICATE_STATUS_ISSUED) {
    return {
      status: DOMAIN_STATUS.VERIFIED,
      reason: tenant.certificateArn ? "certificate_applied" : "certificate_issued",
    };
  }
  if (certificateStatus === CERTIFICATE_STATUS_PENDING) {
    return { status: DOMAIN_STATUS.PENDING, reason: "certificate_pending" };
  }

  return {
    status: currentStatus,
    reason: certificateStatus ? `certificate_${certificateStatus}` : "certificate_missing",
  };
};

export class WebsiteCustomDomainService {
  constructor({
    domainRepository,
    tenantRepository,
    eventRepository = null,
    clock = () => Date.now(),
    config = resolveWebsiteCustomDomainConfigFromEnv(),
  }) {
    assertConfig(config);
    this.domainRepository = domainRepository;
    this.tenantRepository = tenantRepository;
    this.eventRepository = eventRepository;
    this.clock = clock;
    this.config = config;
  }

  buildTenantName(siteId) {
    return `${TENANT_NAME_PREFIX}${siteId}`;
  }

  buildVerificationDetails({
    previous = {},
    domain,
    tenant = null,
    certificate = null,
    dns = null,
    reason = "",
    lastError = null,
  }) {
    return {
      ...previous,
      activationMode: "cloudfront",
      tenantId: tenant?.id || previous.tenantId || null,
      tenantName: tenant?.name || previous.tenantName || null,
      connectionGroupId: tenant?.connectionGroupId || previous.connectionGroupId || null,
      routingEndpoint: this.config.routingEndpoint,
      certificateArn: certificate?.arn || previous.certificateArn || null,
      certificateStatus: certificate?.status || previous.certificateStatus || null,
      certificateApplied: Boolean(tenant?.certificateArn),
      cloudFrontDomainStatus: findTenantDomainStatus(tenant, domain) || previous.cloudFrontDomainStatus || null,
      dnsVerified: dns ? dns.status === DNS_STATUS_VALID : (previous.dnsVerified ?? null),
      dnsInstruction: { type: "CNAME", name: domain, value: this.config.routingEndpoint },
      reason,
      lastError,
    };
  }

  async recordEventSafely(site, eventType, payload) {
    if (!this.eventRepository) {
      return;
    }

    try {
      await this.eventRepository.recordEvent({ propertyId: site.propertyId, hostId: site.hostId, eventType, payload });
    } catch (error) {
      console.error("Failed to record custom domain event.", error);
    }
  }

  async createOrAdoptTenant({ site, domain }) {
    const tenantInput = {
      name: this.buildTenantName(site.id),
      domain,
      distributionId: this.config.distributionId,
      connectionGroupId: this.config.connectionGroupId,
    };

    try {
      return { tenant: await this.tenantRepository.createTenant(tenantInput), lastError: null };
    } catch (error) {
      if (error?.name === SDK_ERROR_DOMAIN_IN_USE) {
        return { tenant: null, lastError: SDK_ERROR_DOMAIN_IN_USE };
      }
      if (error?.name === SDK_ERROR_TENANT_NAME_EXISTS) {
        const adoptedTenant = await this.tenantRepository.getTenantByDomain(domain);
        if (adoptedTenant) {
          return { tenant: adoptedTenant, lastError: null };
        }
      }
      throw new WebsiteCustomDomainError(
        WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.TENANT_CREATE_FAILED,
        `Could not create a CloudFront tenant for ${domain}.`,
        { cause: error }
      );
    }
  }

  async requestCustomDomain({ site, domain }) {
    if (!site?.id) {
      throw new TypeError("Missing website site.");
    }

    const normalizedDomain = normalizeWebsiteCustomDomain(domain);
    const existingRecord = await this.domainRepository.getDomainByName(normalizedDomain);
    if (existingRecord && existingRecord.siteId !== site.id) {
      throw new WebsiteCustomDomainError(
        WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_TAKEN,
        `${normalizedDomain} is already connected to another website.`
      );
    }
    const siteCustomDomain = await this.domainRepository.getCustomDomainBySiteId(site.id);
    if (siteCustomDomain && siteCustomDomain.domain !== normalizedDomain) {
      throw new WebsiteCustomDomainError(
        WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_LIMIT_REACHED,
        `This website already uses ${siteCustomDomain.domain}. Remove it before connecting another domain.`
      );
    }
    if (existingRecord?.verificationDetails?.tenantId) {
      return this.syncCustomDomain({ site, domainRecord: existingRecord });
    }

    const { tenant, lastError } = await this.createOrAdoptTenant({ site, domain: normalizedDomain });
    const status = tenant ? DOMAIN_STATUS.PENDING : DOMAIN_STATUS.FAILED;
    const reason = tenant ? "tenant_created" : "domain_in_use_elsewhere";
    const record = await this.domainRepository.ensureDomain({
      siteId: site.id,
      domain: normalizedDomain,
      domainType: DOMAIN_TYPE_CUSTOM,
      status,
      isPrimary: false,
      verificationDetails: this.buildVerificationDetails({
        previous: existingRecord?.verificationDetails,
        domain: normalizedDomain,
        tenant,
        reason,
        lastError,
      }),
      lastCheckedAt: this.clock(),
    });

    await this.recordEventSafely(site, EVENT_DOMAIN_REQUESTED, {
      siteId: site.id,
      domain: normalizedDomain,
      status,
      tenantId: tenant?.id || null,
    });
    await this.recordStatusEventSafely({ site, domain: normalizedDomain, previousStatus: null, status, reason });

    return record;
  }

  async recordStatusEventSafely({ site, domain, previousStatus, status, reason }) {
    const eventType = status === previousStatus ? null : EVENT_TYPE_BY_STATUS[status];
    if (!eventType) {
      return;
    }

    await this.recordEventSafely(site, eventType, { siteId: site.id, domain, previousStatus, status, reason });
  }

  async readCloudFrontState({ tenantId, domain }) {
    const [initialTenant, certificate] = await Promise.all([
      this.tenantRepository.getTenant(tenantId),
      this.tenantRepository.getManagedCertificate(tenantId),
    ]);
    const shouldApplyCertificate =
      Boolean(initialTenant) && certificate?.status === CERTIFICATE_STATUS_ISSUED && !initialTenant.certificateArn;
    const tenant = shouldApplyCertificate
      ? await this.tenantRepository.applyCertificate({
          tenantId,
          etag: initialTenant.etag,
          certificateArn: certificate.arn,
        })
      : initialTenant;
    const dns =
      tenant && certificate?.status === CERTIFICATE_STATUS_PENDING
        ? await this.tenantRepository.verifyDns({ tenantId, domain })
        : null;

    return { tenant, certificate, dns };
  }

  async syncCustomDomain({ site, domainRecord = null }) {
    if (!site?.id) {
      throw new TypeError("Missing website site.");
    }

    const record = domainRecord || (await this.domainRepository.getCustomDomainBySiteId(site.id));
    if (!record) {
      throw new WebsiteCustomDomainError(
        WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_NOT_FOUND,
        "This website has no custom domain."
      );
    }
    if (record.status === DOMAIN_STATUS.REMOVING) {
      return this.continueRemoval({ site, record });
    }
    const tenantId = record.verificationDetails?.tenantId;
    if (!tenantId) {
      return this.requestCustomDomain({ site, domain: record.domain });
    }

    let cloudFrontState;
    try {
      cloudFrontState = await this.readCloudFrontState({ tenantId, domain: record.domain });
    } catch (error) {
      await this.domainRepository.updateDomainVerificationDetailsById(
        record.id,
        this.buildVerificationDetails({
          previous: record.verificationDetails,
          domain: record.domain,
          reason: record.verificationDetails?.reason || "",
          lastError: error?.name || error?.message || "sync_failed",
        })
      );
      throw new WebsiteCustomDomainError(
        WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.SYNC_FAILED,
        `Could not read the CloudFront status for ${record.domain}.`,
        { cause: error }
      );
    }

    const { status, reason } = mapCloudFrontStateToDomainStatus({
      ...cloudFrontState,
      domain: record.domain,
      currentStatus: record.status,
    });
    const updatedRecord = await this.domainRepository.updateDomainStatusById(
      record.id,
      status,
      this.buildVerificationDetails({
        previous: record.verificationDetails,
        domain: record.domain,
        ...cloudFrontState,
        reason,
      })
    );

    await this.recordStatusEventSafely({
      site,
      domain: record.domain,
      previousStatus: record.status,
      status,
      reason,
    });

    return updatedRecord;
  }

  async removeCustomDomain({ site, domain }) {
    if (!site?.id) {
      throw new TypeError("Missing website site.");
    }

    const record = await this.domainRepository.getCustomDomainBySiteId(site.id);
    if (!record) {
      throw new WebsiteCustomDomainError(
        WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_NOT_FOUND,
        "This website has no custom domain."
      );
    }
    const requestedDomain = String(domain || "")
      .trim()
      .toLowerCase()
      .replace(/\.$/, "");
    if (requestedDomain !== record.domain) {
      throw new WebsiteCustomDomainError(
        WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_NOT_FOUND,
        `${requestedDomain || "That domain"} is no longer this website's custom domain.`
      );
    }

    try {
      return await this.startRemoval({ site, record });
    } catch (error) {
      throw new WebsiteCustomDomainError(
        WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_REMOVE_FAILED,
        `Could not remove ${record.domain}.`,
        { cause: error }
      );
    }
  }

  async startRemoval({ site, record }) {
    const tenantId = record.verificationDetails?.tenantId;
    const tenant = tenantId ? await this.tenantRepository.getTenant(tenantId) : null;
    if (!tenant) {
      return this.deleteCustomDomainRecord({ site, record });
    }
    if (!tenant.enabled) {
      return this.finishRemovalWhenDeployed({ site, record, tenant });
    }

    const removingRecord = await this.markDomainRemoving({ record, tenant });
    const disabledTenant = await this.tenantRepository.disableTenant({ tenantId, etag: tenant.etag });
    if (!disabledTenant) {
      return this.deleteCustomDomainRecord({ site, record: removingRecord });
    }
    return removingRecord;
  }

  async continueRemoval({ site, record }) {
    const tenantId = record.verificationDetails?.tenantId;
    try {
      const tenant = tenantId ? await this.tenantRepository.getTenant(tenantId) : null;
      if (tenant?.enabled) {
        await this.tenantRepository.disableTenant({ tenantId, etag: tenant.etag });
        return record;
      }
      return await this.finishRemovalWhenDeployed({ site, record, tenant });
    } catch (error) {
      throw new WebsiteCustomDomainError(
        WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.SYNC_FAILED,
        `Could not finish removing ${record.domain}.`,
        { cause: error }
      );
    }
  }

  async finishRemovalWhenDeployed({ site, record, tenant }) {
    if (tenant && tenant.status !== CLOUDFRONT_TENANT_STATUS_DEPLOYED) {
      return record.status === DOMAIN_STATUS.REMOVING ? record : this.markDomainRemoving({ record, tenant });
    }
    if (tenant) {
      await this.tenantRepository.deleteTenant({ tenantId: tenant.id, etag: tenant.etag });
    }
    return this.deleteCustomDomainRecord({ site, record });
  }

  async markDomainRemoving({ record, tenant }) {
    return this.domainRepository.updateDomainStatusById(
      record.id,
      DOMAIN_STATUS.REMOVING,
      this.buildVerificationDetails({
        previous: record.verificationDetails,
        domain: record.domain,
        tenant,
        reason: REASON_REMOVAL_REQUESTED,
      })
    );
  }

  async deleteCustomDomainRecord({ site, record }) {
    await this.domainRepository.deleteDomainById(record.id);
    await this.recordEventSafely(site, EVENT_DOMAIN_REMOVED, {
      siteId: site.id,
      domain: record.domain,
      previousStatus: record.status,
      tenantId: record.verificationDetails?.tenantId || null,
    });
    return null;
  }
}
