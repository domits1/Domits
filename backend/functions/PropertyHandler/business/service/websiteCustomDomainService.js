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
const SDK_ERROR_INVALID_ARGUMENT = "InvalidArgument";
const OWNERSHIP_ERROR_PATTERN = /ownership/i;
const REASON_DNS_REQUIRED = "dns_required";
const REASON_TENANT_CREATED = "tenant_created";
const REASON_DOMAIN_IN_USE = "domain_in_use_elsewhere";
const LAST_ERROR_TENANT_NOT_OWNED = "tenant_not_owned";
const EVENT_DOMAIN_REQUESTED = "SITE_DOMAIN_REQUESTED";
const UNIQUE_VIOLATION_CODE = "23505";
const CUSTOM_DOMAIN_PER_SITE_INDEX = "standalone_site_domain_custom_site_unique";
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

export const isCustomDomainSyncable = (record) =>
  Boolean(record?.verificationDetails?.tenantId) || record?.verificationDetails?.reason === REASON_DNS_REQUIRED;

export const isTenantOwnedBySite = (tenant, siteId) => {
  const tenantName = String(tenant?.name || "");
  return !tenantName.startsWith(TENANT_NAME_PREFIX) || tenantName === `${TENANT_NAME_PREFIX}${siteId}`;
};

const logCloudFrontFailure = ({ operation, domain, siteId, error }) => {
  console.error(`[CustomDomain] ${operation} failed for ${domain} (site ${siteId}).`, error);
};

const isForeignTenantError = (error) =>
  error instanceof WebsiteCustomDomainError && error.code === WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.TENANT_NOT_OWNED;

const isUniqueViolationOn = (error, constraintName) =>
  error?.code === UNIQUE_VIOLATION_CODE && error?.constraint === constraintName;

const domainLimitReachedError = (currentDomain = null) =>
  new WebsiteCustomDomainError(
    WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_LIMIT_REACHED,
    currentDomain
      ? `This website already uses ${currentDomain}. Remove it before connecting another domain.`
      : "This website already has a custom domain. Remove it before connecting another domain."
  );

const isOwnershipError = (error) =>
  error?.name === SDK_ERROR_INVALID_ARGUMENT && OWNERSHIP_ERROR_PATTERN.test(error?.message || "");

export const isDomitsTenantOnDistribution = (tenant, distributionId) =>
  String(tenant?.name || "").startsWith(TENANT_NAME_PREFIX) &&
  Boolean(distributionId) &&
  tenant?.distributionId === distributionId;

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
      return { tenant: await this.tenantRepository.createTenant(tenantInput), reason: REASON_TENANT_CREATED, lastError: null };
    } catch (error) {
      if (error?.name === SDK_ERROR_DOMAIN_IN_USE && (await this.freeOrphanedTenant({ site, domain }))) {
        return this.retryCreateTenant({ site, domain, tenantInput });
      }
      return this.mapTenantCreateFailure({ site, domain, error });
    }
  }

  async retryCreateTenant({ site, domain, tenantInput }) {
    try {
      return { tenant: await this.tenantRepository.createTenant(tenantInput), reason: REASON_TENANT_CREATED, lastError: null };
    } catch (error) {
      return this.mapTenantCreateFailure({ site, domain, error });
    }
  }

  async mapTenantCreateFailure({ site, domain, error }) {
    if (error?.name === SDK_ERROR_DOMAIN_IN_USE) {
      return { tenant: null, reason: REASON_DOMAIN_IN_USE, lastError: SDK_ERROR_DOMAIN_IN_USE };
    }
    if (isOwnershipError(error)) {
      return { tenant: null, reason: REASON_DNS_REQUIRED, lastError: SDK_ERROR_INVALID_ARGUMENT };
    }
    if (error?.name === SDK_ERROR_TENANT_NAME_EXISTS) {
      const adoptedTenant = await this.tenantRepository.getTenantByDomain(domain);
      if (adoptedTenant && isTenantOwnedBySite(adoptedTenant, site.id)) {
        return { tenant: adoptedTenant, reason: REASON_TENANT_CREATED, lastError: null };
      }
      if (adoptedTenant) {
        return { tenant: null, reason: REASON_DOMAIN_IN_USE, lastError: LAST_ERROR_TENANT_NOT_OWNED };
      }
    }
    logCloudFrontFailure({ operation: "CreateDistributionTenant", domain, siteId: site.id, error });
    throw new WebsiteCustomDomainError(
      WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.TENANT_CREATE_FAILED,
      `Could not create a CloudFront tenant for ${domain}.`,
      { cause: error }
    );
  }

  async freeOrphanedTenant({ site, domain }) {
    let tenant;
    try {
      tenant = await this.tenantRepository.getTenantByDomain(domain);
    } catch (error) {
      console.error(`[CustomDomain] looking up the tenant holding ${domain} failed.`, error);
      return false;
    }
    if (!isDomitsTenantOnDistribution(tenant, this.config.distributionId)) {
      return false;
    }
    if (tenant.name === this.buildTenantName(site.id)) {
      return false;
    }
    if (!tenant.enabled && tenant.status !== CLOUDFRONT_TENANT_STATUS_DEPLOYED) {
      return false;
    }
    if ((await this.domainRepository.countDomainsByTenantId(tenant.id)) > 0) {
      return false;
    }
    if (tenant.enabled) {
      await this.disableOrphanedTenant({ tenant, domain });
      return false;
    }
    try {
      await this.tenantRepository.deleteTenant({ tenantId: tenant.id, etag: tenant.etag });
      return true;
    } catch (error) {
      console.error(`[CustomDomain] deleting the orphaned tenant holding ${domain} failed.`, error);
      return false;
    }
  }

  async disableOrphanedTenant({ tenant, domain }) {
    try {
      await this.tenantRepository.disableTenant({ tenantId: tenant.id, etag: tenant.etag });
      console.error(`[CustomDomain] disabled the orphaned tenant ${tenant.name} holding ${domain}; the next check can delete it once it is deployed.`);
    } catch (error) {
      console.error(`[CustomDomain] disabling the orphaned tenant holding ${domain} failed.`, error);
    }
  }

  async releaseTenantForSite({ site, record }) {
    const tenantId = record?.verificationDetails?.tenantId;
    if (!tenantId) {
      return null;
    }
    const tenant = await this.tenantRepository.getTenant(tenantId);
    if (!tenant) {
      return null;
    }
    if (!this.isTenantCreatedForSite(tenant, site.id)) {
      console.error(`[CustomDomain] the tenant for ${record.domain} was not created for this website; left untouched (site ${site.id}).`);
      return null;
    }
    if (!tenant.enabled) {
      return tenant;
    }
    return this.tenantRepository.disableTenant({ tenantId: tenant.id, etag: tenant.etag });
  }

  isTenantCreatedForSite(tenant, siteId) {
    return tenant?.name === this.buildTenantName(siteId) && tenant?.distributionId === this.config.distributionId;
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
      throw domainLimitReachedError(siteCustomDomain.domain);
    }
    if (existingRecord?.verificationDetails?.tenantId) {
      return this.syncCustomDomain({ site, domainRecord: existingRecord });
    }

    const record = await this.storeCustomDomainClaim({ site, normalizedDomain, existingRecord });

    await this.recordEventSafely(site, EVENT_DOMAIN_REQUESTED, {
      siteId: site.id,
      domain: normalizedDomain,
      status: DOMAIN_STATUS.PENDING,
      tenantId: null,
    });

    return record;
  }

  async storeCustomDomainClaim({ site, normalizedDomain, existingRecord }) {
    let record;
    try {
      record = await this.domainRepository.ensureDomain({
        siteId: site.id,
        domain: normalizedDomain,
        domainType: DOMAIN_TYPE_CUSTOM,
        status: DOMAIN_STATUS.PENDING,
        isPrimary: false,
        verificationDetails: this.buildVerificationDetails({
          previous: existingRecord?.verificationDetails,
          domain: normalizedDomain,
          reason: REASON_DNS_REQUIRED,
        }),
        lastCheckedAt: this.clock(),
      });
    } catch (error) {
      if (!isUniqueViolationOn(error, CUSTOM_DOMAIN_PER_SITE_INDEX)) {
        throw error;
      }
      throw domainLimitReachedError(await this.readWinningCustomDomain(site));
    }

    if (!record) {
      throw new WebsiteCustomDomainError(
        WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_TAKEN,
        `${normalizedDomain} was connected to another website while it was being set up.`
      );
    }

    return record;
  }

  async readWinningCustomDomain(site) {
    try {
      const winningRecord = await this.domainRepository.getCustomDomainBySiteId(site.id);
      return winningRecord?.domain || null;
    } catch (error) {
      console.error(`[CustomDomain] reading the winning custom domain failed after a duplicate claim (site ${site.id}).`, error);
      return null;
    }
  }

  async provisionTenant({ site, record }) {
    const { tenant, reason, lastError } = await this.createOrAdoptTenant({ site, domain: record.domain });
    const isFailed = !tenant && reason !== REASON_DNS_REQUIRED;
    const status = isFailed ? DOMAIN_STATUS.FAILED : DOMAIN_STATUS.PENDING;
    const updatedRecord = await this.domainRepository.updateDomainStatusById(
      record.id,
      site.id,
      status,
      this.buildVerificationDetails({
        previous: record.verificationDetails,
        domain: record.domain,
        tenant,
        reason,
        lastError,
      })
    );
    if (!updatedRecord) {
      if (tenant) {
        await this.tenantRepository.disableTenant({ tenantId: tenant.id, etag: tenant.etag });
      }
      throw new WebsiteCustomDomainError(
        WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_TAKEN,
        `${record.domain} was connected to another website while it was being set up.`
      );
    }

    await this.recordStatusEventSafely({ site, domain: record.domain, previousStatus: record.status, status, reason });

    return updatedRecord;
  }

  async recordStatusEventSafely({ site, domain, previousStatus, status, reason }) {
    const eventType = status === previousStatus ? null : EVENT_TYPE_BY_STATUS[status];
    if (!eventType) {
      return;
    }

    await this.recordEventSafely(site, eventType, { siteId: site.id, domain, previousStatus, status, reason });
  }

  async readCloudFrontState({ tenantId, domain, siteId }) {
    const [initialTenant, certificate] = await Promise.all([
      this.tenantRepository.getTenant(tenantId),
      this.tenantRepository.getManagedCertificate(tenantId),
    ]);
    if (initialTenant && !isTenantOwnedBySite(initialTenant, siteId)) {
      throw new WebsiteCustomDomainError(
        WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.TENANT_NOT_OWNED,
        `The CloudFront tenant for ${domain} belongs to another website.`
      );
    }
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

    const storedRecord = domainRecord || (await this.domainRepository.getCustomDomainBySiteId(site.id));
    if (!storedRecord) {
      throw new WebsiteCustomDomainError(
        WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_NOT_FOUND,
        "This website has no custom domain."
      );
    }
    if (storedRecord.status === DOMAIN_STATUS.REMOVING) {
      return this.continueRemoval({ site, record: storedRecord });
    }
    const record = storedRecord.verificationDetails?.tenantId
      ? storedRecord
      : await this.provisionTenant({ site, record: storedRecord });
    const tenantId = record.verificationDetails?.tenantId;
    if (!tenantId) {
      return record;
    }

    let cloudFrontState;
    try {
      cloudFrontState = await this.readCloudFrontState({ tenantId, domain: record.domain, siteId: site.id });
    } catch (error) {
      const isForeignTenant = isForeignTenantError(error);
      logCloudFrontFailure({ operation: "Reading the tenant state", domain: record.domain, siteId: site.id, error });
      await this.domainRepository.updateDomainVerificationDetailsById(
        record.id,
        site.id,
        this.buildVerificationDetails({
          previous: record.verificationDetails,
          domain: record.domain,
          reason: record.verificationDetails?.reason || "",
          lastError: isForeignTenant ? LAST_ERROR_TENANT_NOT_OWNED : error?.name || error?.message || "sync_failed",
        })
      );
      if (isForeignTenant) {
        throw error;
      }
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
      site.id,
      status,
      this.buildVerificationDetails({
        previous: record.verificationDetails,
        domain: record.domain,
        ...cloudFrontState,
        reason,
      })
    );
    if (!updatedRecord) {
      throw new WebsiteCustomDomainError(
        WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_NOT_FOUND,
        "This website has no custom domain."
      );
    }

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
      if (isForeignTenantError(error)) {
        throw error;
      }
      logCloudFrontFailure({ operation: "Starting the removal", domain: record.domain, siteId: site.id, error });
      throw new WebsiteCustomDomainError(
        WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_REMOVE_FAILED,
        `Could not remove ${record.domain}.`,
        { cause: error }
      );
    }
  }

  async refuseForeignTenant({ record, tenant }) {
    if (!tenant || isTenantOwnedBySite(tenant, record.siteId)) {
      return;
    }
    await this.domainRepository.updateDomainVerificationDetailsById(
      record.id,
      record.siteId,
      this.buildVerificationDetails({
        previous: record.verificationDetails,
        domain: record.domain,
        reason: record.verificationDetails?.reason || "",
        lastError: LAST_ERROR_TENANT_NOT_OWNED,
      })
    );
    throw new WebsiteCustomDomainError(
      WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.TENANT_NOT_OWNED,
      `The CloudFront tenant for ${record.domain} belongs to another website.`
    );
  }

  async startRemoval({ site, record }) {
    const tenantId = record.verificationDetails?.tenantId;
    const tenant = tenantId ? await this.tenantRepository.getTenant(tenantId) : null;
    if (!tenant) {
      return this.deleteCustomDomainRecord({ site, record });
    }
    await this.refuseForeignTenant({ record, tenant });
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
      await this.refuseForeignTenant({ record, tenant });
      if (tenant?.enabled) {
        await this.tenantRepository.disableTenant({ tenantId, etag: tenant.etag });
        return record;
      }
      return await this.finishRemovalWhenDeployed({ site, record, tenant });
    } catch (error) {
      if (isForeignTenantError(error)) {
        throw error;
      }
      logCloudFrontFailure({ operation: "Finishing the removal", domain: record.domain, siteId: site.id, error });
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
    const removingRecord = await this.domainRepository.updateDomainStatusById(
      record.id,
      record.siteId,
      DOMAIN_STATUS.REMOVING,
      this.buildVerificationDetails({
        previous: record.verificationDetails,
        domain: record.domain,
        tenant,
        reason: REASON_REMOVAL_REQUESTED,
      })
    );
    if (!removingRecord) {
      throw new WebsiteCustomDomainError(
        WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_NOT_FOUND,
        "This website has no custom domain."
      );
    }
    return removingRecord;
  }

  async deleteCustomDomainRecord({ site, record }) {
    const deleted = await this.domainRepository.deleteDomainById(record.id, record.siteId);
    if (!deleted) {
      return null;
    }
    await this.recordEventSafely(site, EVENT_DOMAIN_REMOVED, {
      siteId: site.id,
      domain: record.domain,
      previousStatus: record.status,
      tenantId: record.verificationDetails?.tenantId || null,
    });
    return null;
  }
}
