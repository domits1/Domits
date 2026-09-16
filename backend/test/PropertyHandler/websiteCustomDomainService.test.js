import { describe, it, expect, jest } from "@jest/globals";
import {
  WebsiteCustomDomainService,
  isCustomDomainSyncable,
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
  updatedAt: 1757000000000,
  ...overrides,
});

const buildDomainRepository = (overrides = {}) => ({
  getDomainByName: jest.fn().mockResolvedValue(null),
  getCustomDomainBySiteId: jest.fn().mockResolvedValue(null),
  ensureDomain: jest.fn(async (input) => buildRecord(input)),
  claimDomain: jest.fn(async (input) => buildRecord(input)),
  updateDomainStatusById: jest.fn(async (id, siteId, status, verificationDetails) =>
    buildRecord({ id, siteId, status, verificationDetails })
  ),
  updateDomainVerificationDetailsById: jest.fn(async (id, siteId, verificationDetails) =>
    buildRecord({ id, siteId, verificationDetails })
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
  disableTenant: jest.fn().mockResolvedValue({ ...TENANT, etag: "E2TAG", enabled: false, status: "InProgress" }),
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

const namedError = (name, message = name) => Object.assign(new Error(message), { name });
const OWNERSHIP_ERROR_MESSAGE =
  "The provided Domain Name is not valid. Could not verify Domain Name ownership. It may not be pointing to a valid CloudFront resource.";
const DNS_REQUIRED_RECORD = () =>
  buildRecord({ verificationDetails: { tenantId: null, reason: "dns_required", lastError: null } });

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

  it("refuses a domain another site has already proven with a tenant", async () => {
    const domainRepository = buildDomainRepository({
      getDomainByName: jest.fn().mockResolvedValue(buildRecord({ siteId: "site-2" })),
    });
    const { service, tenantRepository } = buildService({ domainRepository });

    await expect(service.requestCustomDomain({ site: SITE, domain: DOMAIN })).rejects.toMatchObject({
      code: WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_TAKEN,
    });
    expect(tenantRepository.createTenant).not.toHaveBeenCalled();
    expect(domainRepository.ensureDomain).not.toHaveBeenCalled();
  });

  it("takes over a domain another site reserved but never proved with a compare-and-swap on the row it read", async () => {
    const unprovenRecord = buildRecord({
      siteId: "site-2",
      updatedAt: 1756000000000,
      verificationDetails: { tenantId: null, reason: "dns_required" },
    });
    const domainRepository = buildDomainRepository({ getDomainByName: jest.fn().mockResolvedValue(unprovenRecord) });
    const { service } = buildService({ domainRepository });

    const record = await service.requestCustomDomain({ site: SITE, domain: DOMAIN });

    expect(record.siteId).toBe(SITE.id);
    expect(domainRepository.ensureDomain).not.toHaveBeenCalled();
    expect(domainRepository.claimDomain).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: DOMAIN,
        fromSiteId: "site-2",
        expectedUpdatedAt: 1756000000000,
        siteId: SITE.id,
        status: "PENDING",
      })
    );
    expect(domainRepository.claimDomain.mock.calls[0][0].verificationDetails).toMatchObject({
      tenantId: null,
      reason: "dns_required",
    });
  });

  it("answers domain_taken and leaves the row alone when the takeover loses the race", async () => {
    const domainRepository = buildDomainRepository({
      getDomainByName: jest
        .fn()
        .mockResolvedValue(buildRecord({ siteId: "site-2", verificationDetails: { tenantId: null, reason: "dns_required" } })),
      claimDomain: jest.fn().mockResolvedValue(null),
    });
    const { service, eventRepository } = buildService({ domainRepository });

    await expect(service.requestCustomDomain({ site: SITE, domain: DOMAIN })).rejects.toMatchObject({
      code: WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_TAKEN,
    });

    expect(domainRepository.claimDomain).toHaveBeenCalledTimes(1);
    expect(domainRepository.ensureDomain).not.toHaveBeenCalled();
    expect(domainRepository.updateDomainStatusById).not.toHaveBeenCalled();
    expect(eventRepository.recordEvent).not.toHaveBeenCalled();
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

  it("stores the claim with the CNAME instruction and leaves CloudFront alone until the DNS record exists", async () => {
    const { service, domainRepository, tenantRepository, eventRepository } = buildService();

    const record = await service.requestCustomDomain({ site: SITE, domain: " WWW.Example.com. " });

    expect(tenantRepository.createTenant).not.toHaveBeenCalled();
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
      tenantId: null,
      reason: "dns_required",
      certificateApplied: false,
      dnsInstruction: { type: "CNAME", name: DOMAIN, value: CONFIG.routingEndpoint },
    });
    expect(eventRepository.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        hostId: SITE.hostId,
        propertyId: SITE.propertyId,
        eventType: "SITE_DOMAIN_REQUESTED",
        payload: { siteId: SITE.id, domain: DOMAIN, status: "PENDING", tenantId: null },
      })
    );
    expect(eventRepository.recordEvent).toHaveBeenCalledTimes(1);
  });

  it("syncs instead of creating when this site already has a tenant for the domain", async () => {
    const domainRepository = buildDomainRepository({ getDomainByName: jest.fn().mockResolvedValue(buildRecord()) });
    const { service, tenantRepository } = buildService({ domainRepository });

    await service.requestCustomDomain({ site: SITE, domain: DOMAIN });

    expect(tenantRepository.createTenant).not.toHaveBeenCalled();
    expect(tenantRepository.getTenant).toHaveBeenCalledWith(TENANT.id);
  });
});

describe("WebsiteCustomDomainService.syncCustomDomain tenant provisioning", () => {
  it("creates the tenant once the DNS record is in place and reads CloudFront in the same sync", async () => {
    const { service, domainRepository, tenantRepository } = buildService();

    const record = await service.syncCustomDomain({ site: SITE, domainRecord: DNS_REQUIRED_RECORD() });

    expect(tenantRepository.createTenant).toHaveBeenCalledWith({
      name: "dbw-site-1",
      domain: DOMAIN,
      distributionId: CONFIG.distributionId,
      connectionGroupId: CONFIG.connectionGroupId,
    });
    expect(domainRepository.updateDomainStatusById.mock.calls[0]).toEqual([
      "domain-1",
      SITE.id,
      "PENDING",
      expect.objectContaining({ tenantId: TENANT.id, reason: "tenant_created", lastError: null }),
    ]);
    expect(tenantRepository.getTenant).toHaveBeenCalledWith(TENANT.id);
    expect(record).toMatchObject({ status: "PENDING" });
    expect(record.verificationDetails).toMatchObject({ tenantId: TENANT.id, reason: "certificate_pending" });
  });

  it("throws domain_taken and disables the fresh tenant when the row changed owner during provisioning", async () => {
    const domainRepository = buildDomainRepository({ updateDomainStatusById: jest.fn().mockResolvedValue(null) });
    const { service, tenantRepository, eventRepository } = buildService({ domainRepository });

    await expect(service.syncCustomDomain({ site: SITE, domainRecord: DNS_REQUIRED_RECORD() })).rejects.toMatchObject({
      code: WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_TAKEN,
    });

    expect(domainRepository.updateDomainStatusById).toHaveBeenCalledWith("domain-1", SITE.id, "PENDING", expect.anything());
    expect(tenantRepository.disableTenant).toHaveBeenCalledWith({ tenantId: TENANT.id, etag: TENANT.etag });
    expect(tenantRepository.getTenant).not.toHaveBeenCalled();
    expect(eventRepository.recordEvent).not.toHaveBeenCalled();
  });

  it("does not touch CloudFront when a tenant-less provisioning result lands on a row that changed owner", async () => {
    const domainRepository = buildDomainRepository({ updateDomainStatusById: jest.fn().mockResolvedValue(null) });
    const tenantRepository = buildTenantRepository({
      createTenant: jest.fn().mockRejectedValue(namedError("InvalidArgument", OWNERSHIP_ERROR_MESSAGE)),
    });
    const { service } = buildService({ domainRepository, tenantRepository });

    await expect(service.syncCustomDomain({ site: SITE, domainRecord: DNS_REQUIRED_RECORD() })).rejects.toMatchObject({
      code: WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_TAKEN,
    });
    expect(tenantRepository.disableTenant).not.toHaveBeenCalled();
  });

  it("keeps dns_required without throwing while CloudFront cannot verify ownership yet", async () => {
    const tenantRepository = buildTenantRepository({
      createTenant: jest.fn().mockRejectedValue(namedError("InvalidArgument", OWNERSHIP_ERROR_MESSAGE)),
    });
    const { service, domainRepository, eventRepository } = buildService({ tenantRepository });

    const record = await service.syncCustomDomain({ site: SITE, domainRecord: DNS_REQUIRED_RECORD() });

    expect(record.status).toBe("PENDING");
    expect(record.verificationDetails).toMatchObject({
      tenantId: null,
      reason: "dns_required",
      lastError: "InvalidArgument",
      dnsInstruction: { type: "CNAME", name: DOMAIN, value: CONFIG.routingEndpoint },
    });
    expect(domainRepository.updateDomainStatusById).toHaveBeenCalledWith("domain-1", SITE.id, "PENDING", expect.anything());
    expect(tenantRepository.getTenant).not.toHaveBeenCalled();
    expect(eventRepository.recordEvent).not.toHaveBeenCalled();
  });

  it("stores FAILED and records SITE_DOMAIN_FAILED when the domain is used by another CloudFront resource", async () => {
    const tenantRepository = buildTenantRepository({
      createTenant: jest.fn().mockRejectedValue(namedError("CNAMEAlreadyExists")),
    });
    const { service, domainRepository, eventRepository } = buildService({ tenantRepository });

    const record = await service.syncCustomDomain({ site: SITE, domainRecord: DNS_REQUIRED_RECORD() });

    expect(record.status).toBe("FAILED");
    expect(domainRepository.updateDomainStatusById).toHaveBeenCalledWith(
      "domain-1",
      SITE.id,
      "FAILED",
      expect.objectContaining({ tenantId: null, reason: "domain_in_use_elsewhere", lastError: "CNAMEAlreadyExists" })
    );
    expect(eventRepository.recordEvent).toHaveBeenCalledTimes(1);
    expect(eventRepository.recordEvent.mock.calls[0][0]).toMatchObject({
      eventType: "SITE_DOMAIN_FAILED",
      payload: expect.objectContaining({ previousStatus: "PENDING", status: "FAILED", reason: "domain_in_use_elsewhere" }),
    });
  });

  it("adopts the existing tenant when the tenant name already exists", async () => {
    const tenantRepository = buildTenantRepository({
      createTenant: jest.fn().mockRejectedValue(namedError("EntityAlreadyExists")),
      getTenantByDomain: jest.fn().mockResolvedValue(TENANT),
    });
    const { service } = buildService({ tenantRepository });

    const record = await service.syncCustomDomain({ site: SITE, domainRecord: DNS_REQUIRED_RECORD() });

    expect(tenantRepository.getTenantByDomain).toHaveBeenCalledWith(DOMAIN);
    expect(record.verificationDetails.tenantId).toBe(TENANT.id);
  });

  it("wraps any other creation failure as TENANT_CREATE_FAILED without touching the record", async () => {
    const tenantRepository = buildTenantRepository({
      createTenant: jest.fn().mockRejectedValue(namedError("AccessDenied")),
    });
    const { service, domainRepository } = buildService({ tenantRepository });

    await expect(service.syncCustomDomain({ site: SITE, domainRecord: DNS_REQUIRED_RECORD() })).rejects.toMatchObject({
      code: WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.TENANT_CREATE_FAILED,
    });
    expect(domainRepository.updateDomainStatusById).not.toHaveBeenCalled();
  });
});

describe("isCustomDomainSyncable", () => {
  it("syncs records with a tenant or a pending DNS claim and leaves other tenant-less records alone", () => {
    expect(isCustomDomainSyncable(buildRecord())).toBe(true);
    expect(isCustomDomainSyncable(DNS_REQUIRED_RECORD())).toBe(true);
    expect(
      isCustomDomainSyncable(
        buildRecord({ status: "FAILED", verificationDetails: { tenantId: null, reason: "domain_in_use_elsewhere" } })
      )
    ).toBe(false);
    expect(isCustomDomainSyncable(null)).toBe(false);
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
    expect(domainRepository.updateDomainStatusById.mock.calls[0][3]).toMatchObject({
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
    expect(eventRepository.recordEvent).toHaveBeenCalledTimes(1);
    expect(eventRepository.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        hostId: SITE.hostId,
        propertyId: SITE.propertyId,
        eventType: "SITE_DOMAIN_ACTIVATED",
        payload: expect.objectContaining({ siteId: SITE.id, domain: DOMAIN, previousStatus: "VERIFIED" }),
      })
    );
  });

  it("records SITE_DOMAIN_VERIFIED when the certificate is issued and SITE_DOMAIN_FAILED when validation times out", async () => {
    const verified = buildService({
      tenantRepository: buildTenantRepository({ getManagedCertificate: jest.fn().mockResolvedValue(ISSUED) }),
    });
    await verified.service.syncCustomDomain({ site: SITE, domainRecord: buildRecord() });
    expect(verified.eventRepository.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "SITE_DOMAIN_VERIFIED" })
    );

    const failed = buildService({
      tenantRepository: buildTenantRepository({
        getManagedCertificate: jest.fn().mockResolvedValue({ ...ISSUED, status: "validation-timed-out" }),
      }),
    });
    await failed.service.syncCustomDomain({ site: SITE, domainRecord: buildRecord() });
    expect(failed.eventRepository.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "SITE_DOMAIN_FAILED",
        payload: expect.objectContaining({ reason: "certificate_validation-timed-out" }),
      })
    );
  });

  it("records nothing when a sync leaves a failed domain failed", async () => {
    const tenantRepository = buildTenantRepository({
      getManagedCertificate: jest.fn().mockResolvedValue({ ...ISSUED, status: "validation-timed-out" }),
    });
    const { service, eventRepository } = buildService({ tenantRepository });

    await service.syncCustomDomain({ site: SITE, domainRecord: buildRecord({ status: "FAILED" }) });

    expect(eventRepository.recordEvent).not.toHaveBeenCalled();
  });

  it("stays PENDING while validation is pending and reports whether DNS points at CloudFront", async () => {
    const tenantRepository = buildTenantRepository({
      verifyDns: jest.fn().mockResolvedValue({ status: "valid-configuration", reason: "" }),
    });
    const { service, domainRepository, eventRepository } = buildService({ tenantRepository });

    const record = await service.syncCustomDomain({ site: SITE, domainRecord: buildRecord() });

    expect(record.status).toBe("PENDING");
    expect(tenantRepository.verifyDns).toHaveBeenCalledWith({ tenantId: TENANT.id, domain: DOMAIN });
    expect(domainRepository.updateDomainStatusById.mock.calls[0][3]).toMatchObject({ dnsVerified: true });
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

  it("writes no status, keeps the domain's own reason and throws SYNC_FAILED when CloudFront is unreachable", async () => {
    const tenantRepository = buildTenantRepository({
      getTenant: jest.fn().mockRejectedValue(namedError("Throttling")),
    });
    const { service, domainRepository } = buildService({ tenantRepository });
    const domainRecord = buildRecord({
      status: "FAILED",
      verificationDetails: { tenantId: TENANT.id, reason: "certificate_expired", lastError: null },
    });

    await expect(service.syncCustomDomain({ site: SITE, domainRecord })).rejects.toMatchObject({
      code: WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.SYNC_FAILED,
    });
    expect(domainRepository.updateDomainStatusById).not.toHaveBeenCalled();
    expect(domainRepository.updateDomainVerificationDetailsById).toHaveBeenCalledWith(
      "domain-1",
      SITE.id,
      expect.objectContaining({ reason: "certificate_expired", lastError: "Throttling" })
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
      "an active domain whose certificate was revoked",
      tenantWith({ domains: [{ domain: DOMAIN, status: "active" }] }),
      { ...ISSUED, status: "revoked" },
      "FAILED",
      "certificate_revoked",
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
