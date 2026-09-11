import { describe, it, expect, jest } from "@jest/globals";
import {
  WebsiteCustomDomainService,
  mapCloudFrontStateToDomainStatus,
} from "../../functions/PropertyHandler/business/service/websiteCustomDomainService.js";
import { WEBSITE_CUSTOM_DOMAIN_ERROR_CODES } from "../../functions/PropertyHandler/util/exception/WebsiteCustomDomainError.js";

const CONFIG = { distributionId: "E18DIST", connectionGroupId: "cg_1", routingEndpoint: "d3lo.cloudfront.net" };
const SITE = { id: "site-1", hostId: "host-1", propertyId: "property-1", status: "PUBLISHED" };
const DOMAIN = "www.example.com";
const TENANT = {
  etag: "E1TAG",
  id: "dt_1",
  name: "dbw-site-1",
  enabled: true,
  status: "Deployed",
  distributionId: "E18DIST",
  connectionGroupId: "cg_1",
  certificateArn: null,
  domains: [{ domain: DOMAIN, status: "inactive" }],
};
const ISSUED = { arn: "arn:cert", status: "issued", validationTokenHost: "cloudfront" };
const PENDING = { arn: "arn:cert", status: "pending-validation", validationTokenHost: "cloudfront" };

const buildRecord = (overrides = {}) => ({
  id: "domain-1",
  siteId: SITE.id,
  domain: DOMAIN,
  domainType: "CUSTOM",
  status: "PENDING",
  isPrimary: false,
  verificationDetails: { tenantId: TENANT.id },
  ...overrides,
});

const buildDomainRepository = (overrides = {}) => ({
  getDomainByName: jest.fn().mockResolvedValue(null),
  getCustomDomainBySiteId: jest.fn().mockResolvedValue(null),
  ensureDomain: jest.fn(async (input) => buildRecord(input)),
  updateDomainStatusById: jest.fn(async (id, status, verificationDetails) =>
    buildRecord({ id, status, verificationDetails })
  ),
  ...overrides,
});

const buildTenantRepository = (overrides = {}) => ({
  createTenant: jest.fn().mockResolvedValue(TENANT),
  getTenant: jest.fn().mockResolvedValue(TENANT),
  getTenantByDomain: jest.fn().mockResolvedValue(null),
  getManagedCertificate: jest.fn().mockResolvedValue(PENDING),
  applyCertificate: jest.fn().mockResolvedValue({ ...TENANT, certificateArn: ISSUED.arn, status: "InProgress" }),
  verifyDns: jest.fn().mockResolvedValue({ status: "unknown-configuration", reason: "" }),
  ...overrides,
});

const buildService = ({
  domainRepository = buildDomainRepository(),
  tenantRepository = buildTenantRepository(),
} = {}) => {
  const eventRepository = { recordEvent: jest.fn().mockResolvedValue(undefined) };
  const service = new WebsiteCustomDomainService({
    domainRepository,
    tenantRepository,
    eventRepository,
    config: CONFIG,
  });
  return { service, domainRepository, tenantRepository, eventRepository };
};

const namedError = (name) => Object.assign(new Error(name), { name });

describe("WebsiteCustomDomainService constructor", () => {
  it("refuses to start without the CloudFront configuration", () => {
    expect(
      () =>
        new WebsiteCustomDomainService({
          domainRepository: {},
          tenantRepository: {},
          config: { ...CONFIG, routingEndpoint: "" },
        })
    ).toThrow(/DIRECT_BOOKING_WEBSITE_CLOUDFRONT_ROUTING_ENDPOINT/);
  });
});

describe("WebsiteCustomDomainService.requestCustomDomain", () => {
  it.each(["example.com", "*.example.com", "shop.direct.domits.com", "bad_label.example.com"])(
    "rejects %s as an invalid custom domain",
    async (domain) => {
      const { service, tenantRepository } = buildService();

      await expect(service.requestCustomDomain({ site: SITE, domain })).rejects.toMatchObject({
        code: WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.INVALID_DOMAIN,
      });
      expect(tenantRepository.createTenant).not.toHaveBeenCalled();
    }
  );

  it("refuses a domain that belongs to another site", async () => {
    const domainRepository = buildDomainRepository({
      getDomainByName: jest.fn().mockResolvedValue(buildRecord({ siteId: "site-2" })),
    });
    const { service, tenantRepository } = buildService({ domainRepository });

    await expect(service.requestCustomDomain({ site: SITE, domain: DOMAIN })).rejects.toMatchObject({
      code: WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_TAKEN,
    });
    expect(tenantRepository.createTenant).not.toHaveBeenCalled();
  });

  it("refuses a second custom domain while the site already has one", async () => {
    const domainRepository = buildDomainRepository({
      getCustomDomainBySiteId: jest.fn().mockResolvedValue(buildRecord({ domain: "www.first.com" })),
    });
    const { service, tenantRepository } = buildService({ domainRepository });

    await expect(service.requestCustomDomain({ site: SITE, domain: DOMAIN })).rejects.toMatchObject({
      code: WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_LIMIT_REACHED,
    });
    expect(tenantRepository.createTenant).not.toHaveBeenCalled();
  });

  it("retries tenant creation for the site's own domain when the earlier attempt left no tenant", async () => {
    const failedRecord = buildRecord({ status: "FAILED", verificationDetails: { tenantId: null } });
    const domainRepository = buildDomainRepository({
      getDomainByName: jest.fn().mockResolvedValue(failedRecord),
      getCustomDomainBySiteId: jest.fn().mockResolvedValue(failedRecord),
    });
    const { service, tenantRepository } = buildService({ domainRepository });

    const record = await service.requestCustomDomain({ site: SITE, domain: DOMAIN });

    expect(tenantRepository.createTenant).toHaveBeenCalledTimes(1);
    expect(record.status).toBe("PENDING");
  });

  it("creates a tenant and persists a pending non-primary custom domain with the CNAME instruction", async () => {
    const { service, domainRepository, tenantRepository, eventRepository } = buildService();

    const record = await service.requestCustomDomain({ site: SITE, domain: " WWW.Example.com. " });

    expect(tenantRepository.createTenant).toHaveBeenCalledWith({
      name: "dbw-site-1",
      domain: DOMAIN,
      distributionId: CONFIG.distributionId,
      connectionGroupId: CONFIG.connectionGroupId,
    });
    expect(domainRepository.ensureDomain).toHaveBeenCalledWith(
      expect.objectContaining({
        siteId: SITE.id,
        domain: DOMAIN,
        domainType: "CUSTOM",
        status: "PENDING",
        isPrimary: false,
      })
    );
    expect(record.verificationDetails).toMatchObject({
      activationMode: "cloudfront",
      tenantId: TENANT.id,
      certificateApplied: false,
      dnsInstruction: { type: "CNAME", name: DOMAIN, value: CONFIG.routingEndpoint },
    });
    expect(eventRepository.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        hostId: SITE.hostId,
        propertyId: SITE.propertyId,
        eventType: "WEBSITE_DOMAIN_REQUESTED",
      })
    );
  });

  it("persists FAILED without throwing when the domain is already used by another CloudFront resource", async () => {
    const tenantRepository = buildTenantRepository({
      createTenant: jest.fn().mockRejectedValue(namedError("CNAMEAlreadyExists")),
    });
    const { service, domainRepository } = buildService({ tenantRepository });

    const record = await service.requestCustomDomain({ site: SITE, domain: DOMAIN });

    expect(record.status).toBe("FAILED");
    expect(domainRepository.ensureDomain.mock.calls[0][0]).toMatchObject({
      status: "FAILED",
      verificationDetails: expect.objectContaining({ tenantId: null, lastError: "CNAMEAlreadyExists" }),
    });
  });

  it("adopts the existing tenant when the tenant name already exists", async () => {
    const tenantRepository = buildTenantRepository({
      createTenant: jest.fn().mockRejectedValue(namedError("EntityAlreadyExists")),
      getTenantByDomain: jest.fn().mockResolvedValue(TENANT),
    });
    const { service } = buildService({ tenantRepository });

    const record = await service.requestCustomDomain({ site: SITE, domain: DOMAIN });

    expect(tenantRepository.getTenantByDomain).toHaveBeenCalledWith(DOMAIN);
    expect(record.verificationDetails.tenantId).toBe(TENANT.id);
  });

  it("wraps any other creation failure as TENANT_CREATE_FAILED", async () => {
    const tenantRepository = buildTenantRepository({
      createTenant: jest.fn().mockRejectedValue(namedError("AccessDenied")),
    });
    const { service, domainRepository } = buildService({ tenantRepository });

    await expect(service.requestCustomDomain({ site: SITE, domain: DOMAIN })).rejects.toMatchObject({
      code: WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.TENANT_CREATE_FAILED,
    });
    expect(domainRepository.ensureDomain).not.toHaveBeenCalled();
  });

  it("syncs instead of creating when this site already has a tenant for the domain", async () => {
    const domainRepository = buildDomainRepository({ getDomainByName: jest.fn().mockResolvedValue(buildRecord()) });
    const { service, tenantRepository } = buildService({ domainRepository });

    await service.requestCustomDomain({ site: SITE, domain: DOMAIN });

    expect(tenantRepository.createTenant).not.toHaveBeenCalled();
    expect(tenantRepository.getTenant).toHaveBeenCalledWith(TENANT.id);
  });
});

describe("WebsiteCustomDomainService.syncCustomDomain", () => {
  it("applies an issued certificate exactly once using the tenant etag and moves to VERIFIED", async () => {
    const tenantRepository = buildTenantRepository({ getManagedCertificate: jest.fn().mockResolvedValue(ISSUED) });
    const { service, domainRepository } = buildService({ tenantRepository });

    const record = await service.syncCustomDomain({ site: SITE, domainRecord: buildRecord() });

    expect(tenantRepository.applyCertificate).toHaveBeenCalledTimes(1);
    expect(tenantRepository.applyCertificate).toHaveBeenCalledWith({
      tenantId: TENANT.id,
      etag: TENANT.etag,
      certificateArn: ISSUED.arn,
    });
    expect(record.status).toBe("VERIFIED");
    expect(domainRepository.updateDomainStatusById.mock.calls[0][2]).toMatchObject({
      certificateArn: ISSUED.arn,
      certificateApplied: true,
      reason: "certificate_applied",
    });
  });

  it("does not apply the certificate again once the tenant already carries it", async () => {
    const tenantRepository = buildTenantRepository({
      getTenant: jest.fn().mockResolvedValue({ ...TENANT, certificateArn: ISSUED.arn }),
      getManagedCertificate: jest.fn().mockResolvedValue(ISSUED),
    });
    const { service } = buildService({ tenantRepository });

    const record = await service.syncCustomDomain({ site: SITE, domainRecord: buildRecord() });

    expect(tenantRepository.applyCertificate).not.toHaveBeenCalled();
    expect(record.status).toBe("VERIFIED");
  });

  it("moves to ACTIVE when CloudFront reports the domain active and records the status change", async () => {
    const tenantRepository = buildTenantRepository({
      getTenant: jest.fn().mockResolvedValue({
        ...TENANT,
        certificateArn: ISSUED.arn,
        domains: [{ domain: DOMAIN, status: "active" }],
      }),
      getManagedCertificate: jest.fn().mockResolvedValue(ISSUED),
    });
    const { service, eventRepository } = buildService({ tenantRepository });

    const record = await service.syncCustomDomain({ site: SITE, domainRecord: buildRecord({ status: "VERIFIED" }) });

    expect(record.status).toBe("ACTIVE");
    expect(eventRepository.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "WEBSITE_DOMAIN_STATUS_CHANGED",
        payload: expect.objectContaining({ previousStatus: "VERIFIED", status: "ACTIVE" }),
      })
    );
  });

  it("stays PENDING while validation is pending and reports whether DNS points at CloudFront", async () => {
    const tenantRepository = buildTenantRepository({
      verifyDns: jest.fn().mockResolvedValue({ status: "valid-configuration", reason: "" }),
    });
    const { service, domainRepository, eventRepository } = buildService({ tenantRepository });

    const record = await service.syncCustomDomain({ site: SITE, domainRecord: buildRecord() });

    expect(record.status).toBe("PENDING");
    expect(tenantRepository.verifyDns).toHaveBeenCalledWith({ tenantId: TENANT.id, domain: DOMAIN });
    expect(domainRepository.updateDomainStatusById.mock.calls[0][2]).toMatchObject({ dnsVerified: true });
    expect(eventRepository.recordEvent).not.toHaveBeenCalled();
  });

  it("loads the custom domain record for the site when none is given", async () => {
    const domainRepository = buildDomainRepository({
      getCustomDomainBySiteId: jest.fn().mockResolvedValue(buildRecord()),
    });
    const { service } = buildService({ domainRepository });

    await expect(service.syncCustomDomain({ site: SITE })).resolves.toMatchObject({ status: "PENDING" });
    expect(domainRepository.getCustomDomainBySiteId).toHaveBeenCalledWith(SITE.id);
  });

  it("throws DOMAIN_NOT_FOUND when the site has no custom domain", async () => {
    const { service } = buildService();

    await expect(service.syncCustomDomain({ site: SITE })).rejects.toMatchObject({
      code: WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_NOT_FOUND,
    });
  });

  it("keeps the current status, stores the error and throws SYNC_FAILED when CloudFront is unreachable", async () => {
    const tenantRepository = buildTenantRepository({
      getTenant: jest.fn().mockRejectedValue(namedError("Throttling")),
    });
    const { service, domainRepository } = buildService({ tenantRepository });

    await expect(
      service.syncCustomDomain({ site: SITE, domainRecord: buildRecord({ status: "VERIFIED" }) })
    ).rejects.toMatchObject({
      code: WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.SYNC_FAILED,
    });
    expect(domainRepository.updateDomainStatusById).toHaveBeenCalledWith(
      "domain-1",
      "VERIFIED",
      expect.objectContaining({ lastError: "Throttling" })
    );
  });
});

describe("mapCloudFrontStateToDomainStatus", () => {
  const tenantWith = (overrides) => ({ ...TENANT, ...overrides });

  it.each([
    ["a missing tenant", null, ISSUED, "FAILED", "tenant_not_found"],
    ["a disabled tenant", tenantWith({ enabled: false }), ISSUED, "DISABLED", "tenant_disabled"],
    [
      "an active domain",
      tenantWith({ domains: [{ domain: DOMAIN, status: "active" }] }),
      ISSUED,
      "ACTIVE",
      "domain_active",
    ],
    [
      "a timed out validation",
      TENANT,
      { ...ISSUED, status: "validation-timed-out" },
      "FAILED",
      "certificate_validation-timed-out",
    ],
    ["an issued certificate not yet applied", TENANT, ISSUED, "VERIFIED", "certificate_issued"],
    ["a pending validation", TENANT, PENDING, "PENDING", "certificate_pending"],
  ])("maps %s", (_label, tenant, certificate, expectedStatus, expectedReason) => {
    expect(mapCloudFrontStateToDomainStatus({ tenant, certificate, domain: DOMAIN, currentStatus: "PENDING" })).toEqual(
      {
        status: expectedStatus,
        reason: expectedReason,
      }
    );
  });

  it("leaves the status unchanged for the undocumented inactive certificate state", () => {
    expect(
      mapCloudFrontStateToDomainStatus({
        tenant: TENANT,
        certificate: { ...ISSUED, status: "inactive" },
        domain: DOMAIN,
        currentStatus: "VERIFIED",
      })
    ).toEqual({ status: "VERIFIED", reason: "certificate_inactive" });
  });
});
