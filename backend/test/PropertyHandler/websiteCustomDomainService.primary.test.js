import { describe, it, expect, jest } from "@jest/globals";
import { WebsiteCustomDomainService } from "../../functions/PropertyHandler/business/service/websiteCustomDomainService.js";
import { WEBSITE_CUSTOM_DOMAIN_ERROR_CODES } from "../../functions/PropertyHandler/util/exception/WebsiteCustomDomainError.js";

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

describe("WebsiteCustomDomainService main address hand-back", () => {
  it("hands the main address back to the fallback before the tenant of a primary domain is disabled", async () => {
    const { service, domainRepository, tenantRepository } = buildService({ record: buildRecord({ isPrimary: true }) });

    const record = await service.removeCustomDomain({ site: SITE, domain: DOMAIN });

    expect(domainRepository.updateDomainStatusById).toHaveBeenCalledWith(
      "domain-1",
      SITE.id,
      "REMOVING",
      expect.anything()
    );
    expect(domainRepository.restoreFallbackDomainAsPrimary).toHaveBeenCalledWith(SITE.id);
    expect(domainRepository.restoreFallbackDomainAsPrimary.mock.invocationCallOrder[0]).toBeLessThan(
      tenantRepository.disableTenant.mock.invocationCallOrder[0]
    );
    expect(record.isPrimary).toBe(false);
  });

  it("leaves the flag alone when a non-primary domain is removed", async () => {
    const { service, domainRepository } = buildService();

    await service.removeCustomDomain({ site: SITE, domain: DOMAIN });

    expect(domainRepository.restoreFallbackDomainAsPrimary).not.toHaveBeenCalled();
  });

  it("hands the main address back when a sync moves the primary domain off ACTIVE", async () => {
    const tenantRepository = buildTenantRepository({
      getManagedCertificate: jest.fn().mockResolvedValue({ ...ISSUED, status: "expired" }),
    });
    const { service, domainRepository } = buildService({ record: buildRecord({ isPrimary: true }), tenantRepository });

    const record = await service.syncCustomDomain({ site: SITE });

    expect(domainRepository.updateDomainStatusById).toHaveBeenCalledWith(
      "domain-1",
      SITE.id,
      "FAILED",
      expect.anything()
    );
    expect(domainRepository.restoreFallbackDomainAsPrimary).toHaveBeenCalledWith(SITE.id);
    expect(record.isPrimary).toBe(false);
  });

  it("keeps the main address when a sync leaves the primary domain live", async () => {
    const { service, domainRepository } = buildService({ record: buildRecord({ isPrimary: true }) });

    const record = await service.syncCustomDomain({ site: SITE });

    expect(record.status).toBe("ACTIVE");
    expect(record.isPrimary).toBe(true);
    expect(domainRepository.restoreFallbackDomainAsPrimary).not.toHaveBeenCalled();
  });

  it("restores the fallback once the row of a primary domain is deleted", async () => {
    const tenantRepository = buildTenantRepository({ getTenant: jest.fn().mockResolvedValue(null) });
    const { service, domainRepository } = buildService({ record: buildRecord({ isPrimary: true }), tenantRepository });

    await expect(service.removeCustomDomain({ site: SITE, domain: DOMAIN })).resolves.toBeNull();

    expect(domainRepository.deleteDomainById).toHaveBeenCalledWith("domain-1", SITE.id);
    expect(domainRepository.restoreFallbackDomainAsPrimary).toHaveBeenCalledWith(SITE.id);
    expect(domainRepository.deleteDomainById.mock.invocationCallOrder[0]).toBeLessThan(
      domainRepository.restoreFallbackDomainAsPrimary.mock.invocationCallOrder[0]
    );
  });
});
