import { describe, it, expect, jest } from "@jest/globals";
import { WebsiteCustomDomainService } from "../../functions/PropertyHandler/business/service/websiteCustomDomainService.js";
import { WEBSITE_CUSTOM_DOMAIN_ERROR_CODES } from "../../functions/PropertyHandler/util/exception/WebsiteCustomDomainError.js";
import { createStoringDomainRepository, serializationConflict } from "./support/storingDomainRepository.js";

const CONFIG = { distributionId: "E18DIST", connectionGroupId: "cg_1", routingEndpoint: "d3lo.cloudfront.net" };
const SITE = { id: "site-1", hostId: "host-1", propertyId: "property-1", status: "PUBLISHED" };
const DOMAIN = "www.example.com";
const FALLBACK = {
  id: "domain-0",
  siteId: SITE.id,
  domain: "villa-site1.direct.domits.com",
  domainType: "FALLBACK",
  status: "ACTIVE",
  isPrimary: true,
  verificationDetails: {},
};
const ISSUED = { arn: "arn:cert", status: "issued", validationTokenHost: "cloudfront" };
const TENANT = {
  etag: "E1TAG",
  id: "dt_1",
  name: "dbw-site-1",
  enabled: true,
  status: "Deployed",
  distributionId: "E18DIST",
  connectionGroupId: "cg_1",
  certificateArn: ISSUED.arn,
  domains: [{ domain: DOMAIN, status: "active" }],
};

const buildRecord = (overrides = {}) => ({
  id: "domain-1",
  siteId: SITE.id,
  domain: DOMAIN,
  domainType: "CUSTOM",
  status: "ACTIVE",
  isPrimary: false,
  verificationDetails: { tenantId: TENANT.id, certificateArn: ISSUED.arn },
  updatedAt: 1757000000000,
  ...overrides,
});

const buildDomainRepository = (record, overrides = {}) => ({
  getCustomDomainBySiteId: jest.fn().mockResolvedValue(record),
  listDomainsBySiteId: jest.fn().mockResolvedValue([
    { ...FALLBACK, isPrimary: false },
    { ...record, isPrimary: true },
  ]),
  promoteDomainToPrimary: jest.fn().mockResolvedValue([
    { ...FALLBACK, isPrimary: false },
    { ...record, isPrimary: true },
  ]),
  restoreFallbackDomainAsPrimary: jest.fn().mockResolvedValue([
    { ...FALLBACK, isPrimary: true },
    { ...record, isPrimary: false },
  ]),
  updateDomainStatusById: jest.fn(async (id, siteId, status, verificationDetails) => ({
    ...record,
    status,
    verificationDetails,
  })),
  updateDomainVerificationDetailsById: jest.fn(async (id, siteId, verificationDetails) => ({
    ...record,
    verificationDetails,
  })),
  deleteDomainById: jest.fn().mockResolvedValue(true),
  ...overrides,
});

const buildTenantRepository = (overrides = {}) => ({
  createTenant: jest.fn().mockResolvedValue(TENANT),
  getTenant: jest.fn().mockResolvedValue(TENANT),
  getTenantByDomain: jest.fn().mockResolvedValue(null),
  getManagedCertificate: jest.fn().mockResolvedValue(ISSUED),
  applyCertificate: jest.fn().mockResolvedValue(TENANT),
  verifyDns: jest.fn().mockResolvedValue({ status: "valid-configuration", reason: "" }),
  disableTenant: jest.fn().mockResolvedValue({ ...TENANT, etag: "E2TAG", enabled: false, status: "InProgress" }),
  deleteTenant: jest.fn().mockResolvedValue(true),
  ...overrides,
});

const buildService = ({
  record = buildRecord(),
  domainRepository,
  tenantRepository = buildTenantRepository(),
} = {}) => {
  const repository = domainRepository || buildDomainRepository(record);
  const eventRepository = { recordEvent: jest.fn().mockResolvedValue(undefined) };
  const service = new WebsiteCustomDomainService({
    domainRepository: repository,
    tenantRepository,
    eventRepository,
    config: CONFIG,
  });
  return { service, domainRepository: repository, tenantRepository, eventRepository };
};

describe("WebsiteCustomDomainService.promoteCustomDomain", () => {
  it("moves the flag to the live custom domain in one statement, records the event and returns the refreshed list", async () => {
    const { service, domainRepository, eventRepository } = buildService();

    const domains = await service.promoteCustomDomain({ site: SITE, domain: " WWW.Example.com. " });

    expect(domainRepository.promoteDomainToPrimary).toHaveBeenCalledWith(SITE.id, "domain-1");
    expect(domainRepository.promoteDomainToPrimary).toHaveBeenCalledTimes(1);
    expect(eventRepository.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "SITE_DOMAIN_PROMOTED",
        payload: { siteId: SITE.id, domain: DOMAIN, previousPrimaryDomain: FALLBACK.domain },
      })
    );
    expect(domains.map((entry) => [entry.domain, entry.isPrimary])).toEqual([
      [FALLBACK.domain, false],
      [DOMAIN, true],
    ]);
  });

  it("refuses a domain that is not live yet without touching the flag", async () => {
    const { service, domainRepository, eventRepository } = buildService({ record: buildRecord({ status: "PENDING" }) });

    await expect(service.promoteCustomDomain({ site: SITE, domain: DOMAIN })).rejects.toMatchObject({
      code: WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_NOT_ACTIVE,
      statusCode: 409,
    });

    expect(domainRepository.promoteDomainToPrimary).not.toHaveBeenCalled();
    expect(eventRepository.recordEvent).not.toHaveBeenCalled();
  });

  it("refuses a domain that is being removed", async () => {
    const { service, domainRepository } = buildService({ record: buildRecord({ status: "REMOVING" }) });

    await expect(service.promoteCustomDomain({ site: SITE, domain: DOMAIN })).rejects.toMatchObject({
      code: WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_NOT_ACTIVE,
    });

    expect(domainRepository.promoteDomainToPrimary).not.toHaveBeenCalled();
  });

  it("refuses a domain that is no longer the stored one so a stale tab reloads", async () => {
    const { service, domainRepository } = buildService();

    await expect(service.promoteCustomDomain({ site: SITE, domain: "www.other.com" })).rejects.toMatchObject({
      code: WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_NOT_FOUND,
    });

    expect(domainRepository.promoteDomainToPrimary).not.toHaveBeenCalled();
  });

  it("answers the current list without a write when the domain is already the main address", async () => {
    const { service, domainRepository, eventRepository } = buildService({ record: buildRecord({ isPrimary: true }) });

    const domains = await service.promoteCustomDomain({ site: SITE, domain: DOMAIN });

    expect(domainRepository.promoteDomainToPrimary).not.toHaveBeenCalled();
    expect(eventRepository.recordEvent).not.toHaveBeenCalled();
    expect(domains).toHaveLength(2);
  });

  it("throws DOMAIN_NOT_ACTIVE when the statement changed nothing and the row is genuinely no longer live", async () => {
    const record = buildRecord();
    const domainRepository = buildDomainRepository(record, {
      getCustomDomainBySiteId: jest
        .fn()
        .mockResolvedValueOnce(record)
        .mockResolvedValueOnce(buildRecord({ status: "REMOVING" })),
      promoteDomainToPrimary: jest.fn().mockResolvedValue([]),
    });
    const { service, eventRepository } = buildService({ record, domainRepository });

    await expect(service.promoteCustomDomain({ site: SITE, domain: DOMAIN })).rejects.toMatchObject({
      code: WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_NOT_ACTIVE,
    });

    expect(eventRepository.recordEvent).not.toHaveBeenCalled();
    expect(domainRepository.listDomainsBySiteId).not.toHaveBeenCalled();
  });

  it("treats zero changed rows as success when a concurrent promote already moved the flag", async () => {
    const record = buildRecord();
    const domainRepository = buildDomainRepository(record, {
      getCustomDomainBySiteId: jest
        .fn()
        .mockResolvedValueOnce(record)
        .mockResolvedValueOnce(buildRecord({ isPrimary: true })),
      promoteDomainToPrimary: jest.fn().mockResolvedValue([]),
    });
    const { service, eventRepository } = buildService({ record, domainRepository });

    const domains = await service.promoteCustomDomain({ site: SITE, domain: DOMAIN });

    expect(domainRepository.promoteDomainToPrimary).toHaveBeenCalledTimes(1);
    expect(domainRepository.getCustomDomainBySiteId).toHaveBeenCalledTimes(2);
    expect(eventRepository.recordEvent).not.toHaveBeenCalled();
    expect(domains.map((entry) => [entry.domain, entry.isPrimary])).toEqual([
      [FALLBACK.domain, false],
      [DOMAIN, true],
    ]);
  });

  it("explains that the main address changed when the row is still live but lost the flag meanwhile", async () => {
    const record = buildRecord();
    const domainRepository = buildDomainRepository(record, {
      getCustomDomainBySiteId: jest.fn().mockResolvedValueOnce(record).mockResolvedValueOnce(buildRecord()),
      promoteDomainToPrimary: jest.fn().mockResolvedValue([]),
    });
    const { service, eventRepository } = buildService({ record, domainRepository });

    await expect(service.promoteCustomDomain({ site: SITE, domain: DOMAIN })).rejects.toMatchObject({
      code: WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.PRIMARY_CHANGED,
      statusCode: 409,
      message: expect.stringMatching(/main address of this website changed while this request was running/i),
    });
    expect(eventRepository.recordEvent).not.toHaveBeenCalled();
  });

  it("throws DOMAIN_NOT_FOUND when the statement changed nothing because the row is gone", async () => {
    const record = buildRecord();
    const domainRepository = buildDomainRepository(record, {
      getCustomDomainBySiteId: jest.fn().mockResolvedValueOnce(record).mockResolvedValueOnce(null),
      promoteDomainToPrimary: jest.fn().mockResolvedValue([]),
    });
    const { service } = buildService({ record, domainRepository });

    await expect(service.promoteCustomDomain({ site: SITE, domain: DOMAIN })).rejects.toMatchObject({
      code: WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_NOT_FOUND,
    });
  });
});


const storedFallback = (overrides = {}) => ({
  id: "domain-0",
  siteId: SITE.id,
  domain: FALLBACK.domain,
  domainType: "FALLBACK",
  status: "ACTIVE",
  isPrimary: true,
  verificationDetails: {},
  lastCheckedAt: 1756000000000,
  createdAt: 1756000000000,
  updatedAt: 1756000000000,
  ...overrides,
});

const storedCustom = (overrides = {}) => ({
  id: "domain-1",
  siteId: SITE.id,
  domain: DOMAIN,
  domainType: "CUSTOM",
  status: "ACTIVE",
  isPrimary: false,
  verificationDetails: { tenantId: TENANT.id, certificateArn: ISSUED.arn },
  lastCheckedAt: 1757000000000,
  createdAt: 1757000000000,
  updatedAt: 1757000000000,
  ...overrides,
});

const promotedSite = () => [storedFallback({ isPrimary: false }), storedCustom({ isPrimary: true })];

const buildStoringService = ({ rows, tenantRepository = buildTenantRepository() } = {}) => {
  const domainRepository = createStoringDomainRepository({ rows });
  const eventRepository = { recordEvent: jest.fn().mockResolvedValue(undefined) };
  const service = new WebsiteCustomDomainService({
    domainRepository,
    tenantRepository,
    eventRepository,
    config: CONFIG,
  });
  return { service, domainRepository, tenantRepository, eventRepository };
};

const primaryDomainOf = (domainRepository) => domainRepository.snapshot().find((row) => row.isPrimary)?.domain || null;

describe("WebsiteCustomDomainService main address hand-back", () => {
  it("moves the main address back to the fallback and writes REMOVING before the tenant is disabled", async () => {
    const { service, domainRepository, tenantRepository } = buildStoringService({ rows: promotedSite() });

    const record = await service.removeCustomDomain({ site: SITE, domain: DOMAIN });

    expect(record.status).toBe("REMOVING");
    expect(record.isPrimary).toBe(false);
    expect(primaryDomainOf(domainRepository)).toBe(FALLBACK.domain);
    expect(tenantRepository.disableTenant).toHaveBeenCalledTimes(1);
  });

  it("moves the main address back when a sync takes the domain off ACTIVE", async () => {
    const tenantRepository = buildTenantRepository({
      getManagedCertificate: jest.fn().mockResolvedValue({ ...ISSUED, status: "expired" }),
    });
    const { service, domainRepository } = buildStoringService({ rows: promotedSite(), tenantRepository });

    const record = await service.syncCustomDomain({ site: SITE });

    expect(record.status).toBe("FAILED");
    expect(record.isPrimary).toBe(false);
    expect(primaryDomainOf(domainRepository)).toBe(FALLBACK.domain);
  });

  it("keeps the main address on the custom domain when a sync leaves it live", async () => {
    const { service, domainRepository } = buildStoringService({ rows: promotedSite() });

    const record = await service.syncCustomDomain({ site: SITE });

    expect(record.status).toBe("ACTIVE");
    expect(record.isPrimary).toBe(true);
    expect(primaryDomainOf(domainRepository)).toBe(DOMAIN);
  });

  it("restores the fallback when the row holding the main address is deleted", async () => {
    const tenantRepository = buildTenantRepository({ getTenant: jest.fn().mockResolvedValue(null) });
    const { service, domainRepository } = buildStoringService({ rows: promotedSite(), tenantRepository });

    await expect(service.removeCustomDomain({ site: SITE, domain: DOMAIN })).resolves.toBeNull();

    expect(domainRepository.rowById("domain-1")).toBeNull();
    expect(primaryDomainOf(domainRepository)).toBe(FALLBACK.domain);
  });

  it("leaves the fallback row untouched when it already holds the main address", async () => {
    const { service, domainRepository } = buildStoringService({ rows: [storedFallback(), storedCustom()] });

    await service.removeCustomDomain({ site: SITE, domain: DOMAIN });

    expect(primaryDomainOf(domainRepository)).toBe(FALLBACK.domain);
    expect(domainRepository.rowById("domain-0").updatedAt).toBe(1756000000000);
  });
});

describe("WebsiteCustomDomainService main address under partial failure", () => {
  it("writes neither the status nor the flag when the fallback restore fails during removal", async () => {
    const { service, domainRepository, tenantRepository } = buildStoringService({ rows: promotedSite() });
    domainRepository.failNext("restoreFallback", new Error("restore unavailable"));

    await expect(service.removeCustomDomain({ site: SITE, domain: DOMAIN })).rejects.toMatchObject({
      code: WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_REMOVE_FAILED,
    });

    expect(domainRepository.rowById("domain-1")).toMatchObject({ status: "ACTIVE", isPrimary: true });
    expect(primaryDomainOf(domainRepository)).toBe(DOMAIN);
    expect(tenantRepository.disableTenant).not.toHaveBeenCalled();
  });

  it("keeps the row and the flag when the fallback restore fails during delete", async () => {
    const tenantRepository = buildTenantRepository({ getTenant: jest.fn().mockResolvedValue(null) });
    const { service, domainRepository } = buildStoringService({
      rows: [storedFallback({ isPrimary: false }), storedCustom({ isPrimary: true, status: "REMOVING" })],
      tenantRepository,
    });
    domainRepository.failNext("restoreFallback", new Error("restore unavailable"));

    await expect(service.removeCustomDomain({ site: SITE, domain: DOMAIN })).rejects.toMatchObject({
      code: WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_REMOVE_FAILED,
    });

    expect(domainRepository.rowById("domain-1")).toMatchObject({ status: "REMOVING", isPrimary: true });
    expect(primaryDomainOf(domainRepository)).toBe(DOMAIN);
  });

  it("retries once and completes when the removal transaction conflicts at commit", async () => {
    const { service, domainRepository } = buildStoringService({ rows: promotedSite() });
    domainRepository.failNext("updateDomainStatusAndRestoreFallbackById:commit", serializationConflict());

    const record = await service.removeCustomDomain({ site: SITE, domain: DOMAIN });

    expect(record.status).toBe("REMOVING");
    expect(primaryDomainOf(domainRepository)).toBe(FALLBACK.domain);
  });

  it("repairs a site an earlier failure left with a non-ACTIVE main address", async () => {
    const tenantRepository = buildTenantRepository({
      getTenant: jest.fn().mockResolvedValue({ ...TENANT, enabled: false, status: "InProgress" }),
    });
    const { service, domainRepository } = buildStoringService({
      rows: [storedFallback({ isPrimary: false }), storedCustom({ status: "REMOVING", isPrimary: true })],
      tenantRepository,
    });

    await service.removeCustomDomain({ site: SITE, domain: DOMAIN });

    expect(primaryDomainOf(domainRepository)).toBe(FALLBACK.domain);
    expect(domainRepository.rowById("domain-1")).toMatchObject({ status: "REMOVING", isPrimary: false });
  });
});

describe("WebsiteCustomDomainService custom domain claim", () => {
  it("returns a provisioned row unchanged when a repeated connect from the same site arrives", async () => {
    const { service, domainRepository, eventRepository } = buildStoringService({ rows: promotedSite() });

    const record = await service.requestCustomDomain({ site: SITE, domain: DOMAIN });

    expect(record).toMatchObject({ id: "domain-1", status: "ACTIVE", isPrimary: true });
    expect(record.verificationDetails.tenantId).toBe(TENANT.id);
    expect(domainRepository.rowById("domain-1")).toMatchObject({ status: "ACTIVE", isPrimary: true });
    expect(eventRepository.recordEvent).not.toHaveBeenCalled();
  });

  it("does not reset a row another request provisioned while this connect was waiting", async () => {
    const { service, domainRepository } = buildStoringService({ rows: [storedFallback()] });

    const gate = domainRepository.pauseBefore("claimCustomDomain");
    const delayedConnect = service.requestCustomDomain({ site: SITE, domain: DOMAIN });
    await gate.reached;

    await domainRepository.claimCustomDomain({
      siteId: SITE.id,
      domain: DOMAIN,
      status: "PENDING",
      verificationDetails: {},
    });
    const claimed = domainRepository.snapshot().find((row) => row.domain === DOMAIN);
    await domainRepository.updateDomainStatusById(claimed.id, SITE.id, "ACTIVE", { tenantId: TENANT.id });
    await domainRepository.promoteDomainToPrimary(SITE.id, claimed.id);

    gate.release();
    const record = await delayedConnect;

    expect(record).toMatchObject({ status: "ACTIVE", isPrimary: true });
    expect(record.verificationDetails.tenantId).toBe(TENANT.id);
    expect(primaryDomainOf(domainRepository)).toBe(DOMAIN);
  });

  it("answers domain_taken when another site claimed the same domain first", async () => {
    const { service, domainRepository } = buildStoringService({ rows: [storedFallback()] });

    const gate = domainRepository.pauseBefore("claimCustomDomain");
    const losingConnect = service.requestCustomDomain({ site: SITE, domain: DOMAIN });
    await gate.reached;

    await domainRepository.claimCustomDomain({
      siteId: "site-2",
      domain: DOMAIN,
      status: "PENDING",
      verificationDetails: {},
    });

    gate.release();

    await expect(losingConnect).rejects.toMatchObject({
      code: WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_TAKEN,
    });
    const claimedRows = domainRepository.snapshot().filter((row) => row.domain === DOMAIN);
    expect(claimedRows).toHaveLength(1);
    expect(claimedRows[0].siteId).toBe("site-2");
  });

  it("asks the host to try again instead of blaming another website when the claim resolves to no row", async () => {
    const { service, domainRepository } = buildStoringService({ rows: [storedFallback()] });
    domainRepository.claimCustomDomain = jest.fn().mockResolvedValue({ record: null, created: false });

    await expect(service.requestCustomDomain({ site: SITE, domain: DOMAIN })).rejects.toMatchObject({
      code: WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.SYNC_FAILED,
      statusCode: 502,
    });
  });

  it("answers domain_limit_reached when the per-site index refuses a second custom domain", async () => {
    const { service } = buildStoringService({ rows: [storedFallback(), storedCustom()] });

    await expect(service.requestCustomDomain({ site: SITE, domain: "www.second.com" })).rejects.toMatchObject({
      code: WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_LIMIT_REACHED,
    });
  });
});
