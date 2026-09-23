import { describe, it, expect, jest } from "@jest/globals";
import {
  WebsiteCustomDomainService,
  isCustomDomainSyncable,
  isTenantOwnedBySite,
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
  updateDomainStatusById: jest.fn(async (id, siteId, status, verificationDetails) =>
    buildRecord({ id, siteId, status, verificationDetails })
  ),
  updateDomainVerificationDetailsById: jest.fn(async (id, siteId, verificationDetails) =>
    buildRecord({ id, siteId, verificationDetails })
  ),
  deleteDomainById: jest.fn().mockResolvedValue(true),
  countDomainsByTenantId: jest.fn().mockResolvedValue(0),
  ...overrides,
});

const DISABLED_TENANT = { ...TENANT, etag: "E2TAG", enabled: false, status: "InProgress" };
const DISABLED_DEPLOYED_TENANT = { ...DISABLED_TENANT, etag: "E3TAG", status: "Deployed" };

const buildTenantRepository = (overrides = {}) => ({
  createTenant: jest.fn().mockResolvedValue(TENANT),
  getTenant: jest.fn().mockResolvedValue(TENANT),
  getTenantByDomain: jest.fn().mockResolvedValue(null),
  getManagedCertificate: jest.fn().mockResolvedValue(PENDING),
  applyCertificate: jest.fn().mockResolvedValue({ ...TENANT, certificateArn: ISSUED.arn, status: "InProgress" }),
  verifyDns: jest.fn().mockResolvedValue({ status: "unknown-configuration", reason: "" }),
  disableTenant: jest.fn().mockResolvedValue(DISABLED_TENANT),
  deleteTenant: jest.fn().mockResolvedValue(true),
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

  it.each([
    ["a tenant", { tenantId: TENANT.id, reason: "certificate_pending" }],
    ["no tenant yet", { tenantId: null, reason: "dns_required" }],
  ])("refuses a domain another site holds with %s and writes nothing", async (_label, verificationDetails) => {
    const domainRepository = buildDomainRepository({
      getDomainByName: jest.fn().mockResolvedValue(buildRecord({ siteId: "site-2", verificationDetails })),
    });
    const { service, tenantRepository, eventRepository } = buildService({ domainRepository });

    await expect(service.requestCustomDomain({ site: SITE, domain: DOMAIN })).rejects.toMatchObject({
      code: WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_TAKEN,
    });
    expect(tenantRepository.createTenant).not.toHaveBeenCalled();
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

  it("answers domain_limit_reached with the winning domain when the insert loses the race on the per-site index", async () => {
    const domainRepository = buildDomainRepository({
      getCustomDomainBySiteId: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(buildRecord({ domain: "www.first.com" })),
      ensureDomain: jest.fn().mockRejectedValue(
        Object.assign(
          new Error('duplicate key value violates unique constraint "standalone_site_domain_custom_site_unique"'),
          {
            code: "23505",
            constraint: "standalone_site_domain_custom_site_unique",
          }
        )
      ),
    });
    const { service, tenantRepository, eventRepository } = buildService({ domainRepository });

    await expect(service.requestCustomDomain({ site: SITE, domain: DOMAIN })).rejects.toMatchObject({
      code: WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_LIMIT_REACHED,
      statusCode: 409,
      message: "This website already uses www.first.com. Remove it before connecting another domain.",
    });
    expect(domainRepository.getCustomDomainBySiteId).toHaveBeenCalledTimes(2);
    expect(tenantRepository.createTenant).not.toHaveBeenCalled();
    expect(eventRepository.recordEvent).not.toHaveBeenCalled();
  });

  it("passes a unique violation on any other index through untouched", async () => {
    const violation = Object.assign(
      new Error('duplicate key value violates unique constraint "standalone_site_domain_unique"'),
      {
        code: "23505",
        constraint: "standalone_site_domain_unique",
      }
    );
    const domainRepository = buildDomainRepository({ ensureDomain: jest.fn().mockRejectedValue(violation) });
    const { service, eventRepository } = buildService({ domainRepository });

    await expect(service.requestCustomDomain({ site: SITE, domain: DOMAIN })).rejects.toBe(violation);
    expect(domainRepository.getCustomDomainBySiteId).toHaveBeenCalledTimes(1);
    expect(eventRepository.recordEvent).not.toHaveBeenCalled();
  });

  it("keeps domain_limit_reached with generic wording and logs when the winning row cannot be reread", async () => {
    const readFailure = new Error("connection reset");
    const domainRepository = buildDomainRepository({
      getCustomDomainBySiteId: jest.fn().mockResolvedValueOnce(null).mockRejectedValueOnce(readFailure),
      ensureDomain: jest.fn().mockRejectedValue(
        Object.assign(new Error("duplicate key"), {
          code: "23505",
          constraint: "standalone_site_domain_custom_site_unique",
        })
      ),
    });
    const { service, eventRepository } = buildService({ domainRepository });
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    try {
      await expect(service.requestCustomDomain({ site: SITE, domain: DOMAIN })).rejects.toMatchObject({
        code: WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_LIMIT_REACHED,
        statusCode: 409,
        message: "This website already has a custom domain. Remove it before connecting another domain.",
      });
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining(
          `[CustomDomain] reading the winning custom domain failed after a duplicate claim (site ${SITE.id}).`
        ),
        readFailure
      );
      expect(eventRepository.recordEvent).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it("answers domain_taken and changes nothing when a delayed claim finds the row now belongs to another site", async () => {
    const domainRepository = buildDomainRepository({ ensureDomain: jest.fn().mockResolvedValue(null) });
    const { service, tenantRepository, eventRepository } = buildService({ domainRepository });

    await expect(service.requestCustomDomain({ site: SITE, domain: DOMAIN })).rejects.toMatchObject({
      code: WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_TAKEN,
      statusCode: 409,
    });

    expect(domainRepository.ensureDomain).toHaveBeenCalledTimes(1);
    expect(domainRepository.ensureDomain).toHaveBeenCalledWith(
      expect.objectContaining({ siteId: SITE.id, domain: DOMAIN })
    );
    expect(domainRepository.updateDomainStatusById).not.toHaveBeenCalled();
    expect(tenantRepository.createTenant).not.toHaveBeenCalled();
    expect(tenantRepository.disableTenant).not.toHaveBeenCalled();
    expect(tenantRepository.deleteTenant).not.toHaveBeenCalled();
    expect(eventRepository.recordEvent).not.toHaveBeenCalled();
  });

  it("keeps a stale claim from clearing another site's tenant reference and disabling its tenant", async () => {
    const siteB = { id: "site-2", hostId: "host-2", propertyId: "property-2", status: "PUBLISHED" };
    const tenantB = { ...TENANT, id: "dt_b", name: "dbw-site-2" };
    const rowOfB = buildRecord({
      id: "domain-b",
      siteId: siteB.id,
      status: "ACTIVE",
      verificationDetails: { tenantId: tenantB.id },
    });
    const domainRepository = buildDomainRepository({
      ensureDomain: jest.fn().mockResolvedValue(null),
      getCustomDomainBySiteId: jest.fn(async (siteId) => (siteId === siteB.id ? rowOfB : null)),
      countDomainsByTenantId: jest.fn(async (tenantId) => (tenantId === tenantB.id ? 1 : 0)),
    });
    const tenantRepository = buildTenantRepository({
      getTenant: jest.fn().mockResolvedValue(tenantB),
      getTenantByDomain: jest.fn().mockResolvedValue(tenantB),
    });
    const { service } = buildService({ domainRepository, tenantRepository });

    await expect(service.requestCustomDomain({ site: SITE, domain: DOMAIN })).rejects.toMatchObject({
      code: WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_TAKEN,
    });
    await expect(service.syncCustomDomain({ site: SITE })).rejects.toMatchObject({
      code: WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_NOT_FOUND,
    });

    expect(tenantRepository.createTenant).not.toHaveBeenCalled();
    expect(tenantRepository.disableTenant).not.toHaveBeenCalled();
    expect(tenantRepository.deleteTenant).not.toHaveBeenCalled();
    expect(domainRepository.updateDomainStatusById).not.toHaveBeenCalled();
    expect(await domainRepository.getCustomDomainBySiteId(siteB.id)).toBe(rowOfB);
  });

  it("reclaims the site's own tenant-less row without touching CloudFront", async () => {
    const ownRow = buildRecord({ verificationDetails: { tenantId: null, reason: "dns_required" } });
    const domainRepository = buildDomainRepository({
      getDomainByName: jest.fn().mockResolvedValue(ownRow),
      getCustomDomainBySiteId: jest.fn().mockResolvedValue(ownRow),
    });
    const { service, tenantRepository } = buildService({ domainRepository });

    const record = await service.requestCustomDomain({ site: SITE, domain: DOMAIN });

    expect(domainRepository.ensureDomain).toHaveBeenCalledWith(
      expect.objectContaining({ siteId: SITE.id, domain: DOMAIN, domainType: "CUSTOM", status: "PENDING" })
    );
    expect(record.siteId).toBe(SITE.id);
    expect(record.verificationDetails.reason).toBe("dns_required");
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

    expect(domainRepository.updateDomainStatusById).toHaveBeenCalledWith(
      "domain-1",
      SITE.id,
      "PENDING",
      expect.anything()
    );
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
    expect(domainRepository.updateDomainStatusById).toHaveBeenCalledWith(
      "domain-1",
      SITE.id,
      "PENDING",
      expect.anything()
    );
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
      payload: expect.objectContaining({
        previousStatus: "PENDING",
        status: "FAILED",
        reason: "domain_in_use_elsewhere",
      }),
    });
  });

  describe("orphaned tenant cleanup on CNAMEAlreadyExists", () => {
    const ORPHAN = {
      etag: "EORPHAN",
      id: "dt_orphan",
      name: "dbw-site-9",
      enabled: false,
      status: "Deployed",
      distributionId: CONFIG.distributionId,
      connectionGroupId: CONFIG.connectionGroupId,
      certificateArn: null,
      domains: [{ domain: DOMAIN, status: "inactive" }],
    };
    const cnameOnceThenCreate = () =>
      jest.fn().mockRejectedValueOnce(namedError("CNAMEAlreadyExists")).mockResolvedValue(TENANT);

    it("deletes a disabled, deployed, unreferenced dbw- tenant holding the domain and creates the tenant on retry", async () => {
      const tenantRepository = buildTenantRepository({
        createTenant: cnameOnceThenCreate(),
        getTenantByDomain: jest.fn().mockResolvedValue(ORPHAN),
      });
      const { service, domainRepository } = buildService({ tenantRepository });

      const record = await service.syncCustomDomain({ site: SITE, domainRecord: DNS_REQUIRED_RECORD() });

      expect(domainRepository.countDomainsByTenantId).toHaveBeenCalledWith(ORPHAN.id);
      expect(tenantRepository.deleteTenant).toHaveBeenCalledWith({ tenantId: ORPHAN.id, etag: ORPHAN.etag });
      expect(tenantRepository.createTenant).toHaveBeenCalledTimes(2);
      expect(record.verificationDetails).toMatchObject({
        tenantId: TENANT.id,
        reason: "certificate_pending",
        lastError: null,
      });
      expect(record.status).toBe("PENDING");
    });

    const ENABLED_ORPHAN = { ...ORPHAN, enabled: true };
    const expectAnsweredAsBefore = (record) => {
      expect(record.status).toBe("FAILED");
      expect(record.verificationDetails).toMatchObject({
        reason: "domain_in_use_elsewhere",
        lastError: "CNAMEAlreadyExists",
      });
    };

    it("disables an enabled unreferenced dbw- tenant of another site, logs it, and answers as before", async () => {
      const tenantRepository = buildTenantRepository({
        createTenant: cnameOnceThenCreate(),
        getTenantByDomain: jest.fn().mockResolvedValue(ENABLED_ORPHAN),
      });
      const { service, domainRepository } = buildService({ tenantRepository });
      const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

      try {
        const record = await service.syncCustomDomain({ site: SITE, domainRecord: DNS_REQUIRED_RECORD() });

        expect(domainRepository.countDomainsByTenantId).toHaveBeenCalledWith(ENABLED_ORPHAN.id);
        expect(tenantRepository.disableTenant).toHaveBeenCalledWith({
          tenantId: ENABLED_ORPHAN.id,
          etag: ENABLED_ORPHAN.etag,
        });
        expect(tenantRepository.deleteTenant).not.toHaveBeenCalled();
        expect(tenantRepository.createTenant).toHaveBeenCalledTimes(1);
        expectAnsweredAsBefore(record);
        expect(consoleError).toHaveBeenCalledWith(
          expect.stringContaining(
            `[CustomDomain] disabled the orphaned tenant ${ENABLED_ORPHAN.name} holding ${DOMAIN}`
          )
        );
      } finally {
        consoleError.mockRestore();
      }
    });

    it("leaves an enabled tenant named for the site doing the cleanup alone", async () => {
      const tenantRepository = buildTenantRepository({
        createTenant: cnameOnceThenCreate(),
        getTenantByDomain: jest.fn().mockResolvedValue({ ...ENABLED_ORPHAN, name: `dbw-${SITE.id}` }),
      });
      const { service, domainRepository } = buildService({ tenantRepository });

      const record = await service.syncCustomDomain({ site: SITE, domainRecord: DNS_REQUIRED_RECORD() });

      expect(domainRepository.countDomainsByTenantId).not.toHaveBeenCalled();
      expect(tenantRepository.disableTenant).not.toHaveBeenCalled();
      expect(tenantRepository.deleteTenant).not.toHaveBeenCalled();
      expectAnsweredAsBefore(record);
    });

    it("leaves an enabled tenant that a domain row still references alone", async () => {
      const domainRepository = buildDomainRepository({ countDomainsByTenantId: jest.fn().mockResolvedValue(1) });
      const tenantRepository = buildTenantRepository({
        createTenant: cnameOnceThenCreate(),
        getTenantByDomain: jest.fn().mockResolvedValue(ENABLED_ORPHAN),
      });
      const { service } = buildService({ domainRepository, tenantRepository });

      const record = await service.syncCustomDomain({ site: SITE, domainRecord: DNS_REQUIRED_RECORD() });

      expect(tenantRepository.disableTenant).not.toHaveBeenCalled();
      expect(tenantRepository.deleteTenant).not.toHaveBeenCalled();
      expectAnsweredAsBefore(record);
    });

    it("answers as before with a log when disabling the enabled orphan is refused with a stale etag", async () => {
      const tenantRepository = buildTenantRepository({
        createTenant: cnameOnceThenCreate(),
        getTenantByDomain: jest.fn().mockResolvedValue(ENABLED_ORPHAN),
        disableTenant: jest.fn().mockRejectedValue(namedError("PreconditionFailed")),
      });
      const { service } = buildService({ tenantRepository });
      const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

      try {
        const record = await service.syncCustomDomain({ site: SITE, domainRecord: DNS_REQUIRED_RECORD() });

        expect(tenantRepository.createTenant).toHaveBeenCalledTimes(1);
        expectAnsweredAsBefore(record);
        expect(consoleError).toHaveBeenCalledWith(
          expect.stringContaining(`[CustomDomain] disabling the orphaned tenant holding ${DOMAIN} failed.`),
          expect.anything()
        );
      } finally {
        consoleError.mockRestore();
      }
    });

    it.each([
      ["still rolling out", { ...ORPHAN, status: "InProgress" }],
      ["not created by Domits", { ...ORPHAN, name: "developers-test" }],
      ["on another distribution", { ...ORPHAN, distributionId: "E99OTHER" }],
    ])("never deletes a tenant that is %s and answers as before", async (_label, tenant) => {
      const tenantRepository = buildTenantRepository({
        createTenant: cnameOnceThenCreate(),
        getTenantByDomain: jest.fn().mockResolvedValue(tenant),
      });
      const { service, domainRepository } = buildService({ tenantRepository });

      const record = await service.syncCustomDomain({ site: SITE, domainRecord: DNS_REQUIRED_RECORD() });

      expect(tenantRepository.deleteTenant).not.toHaveBeenCalled();
      expect(domainRepository.countDomainsByTenantId).not.toHaveBeenCalled();
      expect(tenantRepository.createTenant).toHaveBeenCalledTimes(1);
      expect(record.status).toBe("FAILED");
      expect(record.verificationDetails).toMatchObject({
        reason: "domain_in_use_elsewhere",
        lastError: "CNAMEAlreadyExists",
      });
    });

    it("never deletes a tenant that a domain row still references, even when it looks abandoned", async () => {
      const domainRepository = buildDomainRepository({ countDomainsByTenantId: jest.fn().mockResolvedValue(1) });
      const tenantRepository = buildTenantRepository({
        createTenant: cnameOnceThenCreate(),
        getTenantByDomain: jest.fn().mockResolvedValue(ORPHAN),
      });
      const { service } = buildService({ domainRepository, tenantRepository });

      const record = await service.syncCustomDomain({ site: SITE, domainRecord: DNS_REQUIRED_RECORD() });

      expect(tenantRepository.deleteTenant).not.toHaveBeenCalled();
      expect(tenantRepository.createTenant).toHaveBeenCalledTimes(1);
      expect(record.status).toBe("FAILED");
    });

    it("treats a tenant that another cleanup already deleted as freed and still retries the create", async () => {
      const tenantRepository = buildTenantRepository({
        createTenant: cnameOnceThenCreate(),
        getTenantByDomain: jest.fn().mockResolvedValue(ORPHAN),
        deleteTenant: jest.fn().mockResolvedValue(null),
      });
      const { service } = buildService({ tenantRepository });

      const record = await service.syncCustomDomain({ site: SITE, domainRecord: DNS_REQUIRED_RECORD() });

      expect(tenantRepository.createTenant).toHaveBeenCalledTimes(2);
      expect(record.verificationDetails.tenantId).toBe(TENANT.id);
    });

    it("answers as before when the delete is refused with a stale etag and leaves the tenant alone", async () => {
      const tenantRepository = buildTenantRepository({
        createTenant: cnameOnceThenCreate(),
        getTenantByDomain: jest.fn().mockResolvedValue(ORPHAN),
        deleteTenant: jest.fn().mockRejectedValue(namedError("PreconditionFailed")),
      });
      const { service } = buildService({ tenantRepository });
      const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

      try {
        const record = await service.syncCustomDomain({ site: SITE, domainRecord: DNS_REQUIRED_RECORD() });

        expect(tenantRepository.createTenant).toHaveBeenCalledTimes(1);
        expect(record.status).toBe("FAILED");
        expect(record.verificationDetails).toMatchObject({
          reason: "domain_in_use_elsewhere",
          lastError: "CNAMEAlreadyExists",
        });
        expect(consoleError).toHaveBeenCalledWith(
          expect.stringContaining(`[CustomDomain] deleting the orphaned tenant holding ${DOMAIN} failed.`),
          expect.anything()
        );
      } finally {
        consoleError.mockRestore();
      }
    });

    it("answers as before when the tenant lookup itself fails", async () => {
      const tenantRepository = buildTenantRepository({
        createTenant: cnameOnceThenCreate(),
        getTenantByDomain: jest.fn().mockRejectedValue(namedError("AccessDenied")),
      });
      const { service } = buildService({ tenantRepository });
      const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

      try {
        const record = await service.syncCustomDomain({ site: SITE, domainRecord: DNS_REQUIRED_RECORD() });

        expect(tenantRepository.deleteTenant).not.toHaveBeenCalled();
        expect(tenantRepository.createTenant).toHaveBeenCalledTimes(1);
        expect(record.status).toBe("FAILED");
      } finally {
        consoleError.mockRestore();
      }
    });

    it("frees the orphan only once: a second CNAMEAlreadyExists on the retry is stored as before", async () => {
      const tenantRepository = buildTenantRepository({
        createTenant: jest.fn().mockRejectedValue(namedError("CNAMEAlreadyExists")),
        getTenantByDomain: jest.fn().mockResolvedValue(ORPHAN),
      });
      const { service, eventRepository } = buildService({ tenantRepository });

      const record = await service.syncCustomDomain({ site: SITE, domainRecord: DNS_REQUIRED_RECORD() });

      expect(tenantRepository.deleteTenant).toHaveBeenCalledTimes(1);
      expect(tenantRepository.createTenant).toHaveBeenCalledTimes(2);
      expect(record.status).toBe("FAILED");
      expect(record.verificationDetails).toMatchObject({
        reason: "domain_in_use_elsewhere",
        lastError: "CNAMEAlreadyExists",
      });
      expect(eventRepository.recordEvent.mock.calls[0][0]).toMatchObject({ eventType: "SITE_DOMAIN_FAILED" });
    });

    it("wraps any other failure on the retry as TENANT_CREATE_FAILED after the orphan is gone", async () => {
      const tenantRepository = buildTenantRepository({
        createTenant: jest
          .fn()
          .mockRejectedValueOnce(namedError("CNAMEAlreadyExists"))
          .mockRejectedValueOnce(namedError("AccessDenied")),
        getTenantByDomain: jest.fn().mockResolvedValue(ORPHAN),
      });
      const { service, domainRepository } = buildService({ tenantRepository });

      await expect(service.syncCustomDomain({ site: SITE, domainRecord: DNS_REQUIRED_RECORD() })).rejects.toMatchObject(
        {
          code: WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.TENANT_CREATE_FAILED,
        }
      );
      expect(tenantRepository.deleteTenant).toHaveBeenCalledTimes(1);
      expect(domainRepository.updateDomainStatusById).not.toHaveBeenCalled();
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

describe("isTenantOwnedBySite", () => {
  it("accepts our own dbw- name and legacy names, and refuses dbw- names of other sites", () => {
    expect(isTenantOwnedBySite({ name: "dbw-site-1" }, "site-1")).toBe(true);
    expect(isTenantOwnedBySite({ name: "developers-test" }, "site-1")).toBe(true);
    expect(isTenantOwnedBySite({ name: "dbw-site-2" }, "site-1")).toBe(false);
    expect(isTenantOwnedBySite({ name: "dbw-site-10" }, "site-1")).toBe(false);
    expect(isTenantOwnedBySite({ name: "dbw-" }, "site-1")).toBe(false);
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

  it("refuses a dbw- tenant that belongs to another site and touches nothing at CloudFront", async () => {
    const tenantRepository = buildTenantRepository({
      getTenant: jest.fn().mockResolvedValue({ ...TENANT, name: "dbw-site-2" }),
      getManagedCertificate: jest.fn().mockResolvedValue(ISSUED),
    });
    const { service, domainRepository, eventRepository } = buildService({ tenantRepository });
    const domainRecord = buildRecord({
      status: "PENDING",
      verificationDetails: { tenantId: TENANT.id, reason: "certificate_pending", lastError: null },
    });

    await expect(service.syncCustomDomain({ site: SITE, domainRecord })).rejects.toMatchObject({
      code: WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.TENANT_NOT_OWNED,
      statusCode: 409,
    });

    expect(tenantRepository.applyCertificate).not.toHaveBeenCalled();
    expect(tenantRepository.verifyDns).not.toHaveBeenCalled();
    expect(tenantRepository.disableTenant).not.toHaveBeenCalled();
    expect(domainRepository.updateDomainStatusById).not.toHaveBeenCalled();
    expect(domainRepository.updateDomainVerificationDetailsById).toHaveBeenCalledWith(
      "domain-1",
      SITE.id,
      expect.objectContaining({ reason: "certificate_pending", lastError: "tenant_not_owned" })
    );
    expect(eventRepository.recordEvent).not.toHaveBeenCalled();
  });

  it("accepts a legacy tenant whose name has no dbw- prefix", async () => {
    const tenantRepository = buildTenantRepository({
      getTenant: jest.fn().mockResolvedValue({ ...TENANT, name: "developers-test" }),
      getManagedCertificate: jest.fn().mockResolvedValue(ISSUED),
    });
    const { service } = buildService({ tenantRepository });

    const record = await service.syncCustomDomain({ site: SITE, domainRecord: buildRecord() });

    expect(tenantRepository.applyCertificate).toHaveBeenCalledWith({
      tenantId: TENANT.id,
      etag: TENANT.etag,
      certificateArn: ISSUED.arn,
    });
    expect(record.status).toBe("VERIFIED");
  });

  it("does not adopt a tenant named for another site and stores the domain as in use elsewhere", async () => {
    const tenantRepository = buildTenantRepository({
      createTenant: jest.fn().mockRejectedValue(namedError("EntityAlreadyExists")),
      getTenantByDomain: jest.fn().mockResolvedValue({ ...TENANT, name: "dbw-site-2" }),
    });
    const { service, domainRepository } = buildService({ tenantRepository });

    const record = await service.syncCustomDomain({ site: SITE, domainRecord: DNS_REQUIRED_RECORD() });

    expect(record.status).toBe("FAILED");
    expect(domainRepository.updateDomainStatusById).toHaveBeenCalledWith(
      "domain-1",
      SITE.id,
      "FAILED",
      expect.objectContaining({ tenantId: null, reason: "domain_in_use_elsewhere", lastError: "tenant_not_owned" })
    );
    expect(tenantRepository.getTenant).not.toHaveBeenCalled();
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

describe("WebsiteCustomDomainService.releaseTenantForSite", () => {
  it("disables the site's enabled tenant with its current etag when the website is deleted", async () => {
    const { service, tenantRepository } = buildService();

    const result = await service.releaseTenantForSite({ site: SITE, record: buildRecord({ status: "ACTIVE" }) });

    expect(tenantRepository.getTenant).toHaveBeenCalledWith(TENANT.id);
    expect(tenantRepository.disableTenant).toHaveBeenCalledWith({ tenantId: TENANT.id, etag: TENANT.etag });
    expect(tenantRepository.deleteTenant).not.toHaveBeenCalled();
    expect(result).toEqual(DISABLED_TENANT);
  });

  it.each([
    [
      "no tenant id on the row",
      buildRecord({ verificationDetails: { tenantId: null, reason: "dns_required" } }),
      TENANT,
    ],
    ["the tenant already gone", buildRecord(), null],
    ["the tenant already disabled", buildRecord(), DISABLED_TENANT],
    ["a tenant named for another site", buildRecord(), { ...TENANT, name: "dbw-site-2" }],
    ["a hand-made tenant without the dbw- prefix", buildRecord(), { ...TENANT, name: "developers-test" }],
    ["a tenant on another distribution", buildRecord(), { ...TENANT, distributionId: "E99OTHER" }],
  ])("touches nothing at CloudFront with %s", async (_label, record, tenant) => {
    const tenantRepository = buildTenantRepository({ getTenant: jest.fn().mockResolvedValue(tenant) });
    const { service } = buildService({ tenantRepository });
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    try {
      await service.releaseTenantForSite({ site: SITE, record });

      expect(tenantRepository.disableTenant).not.toHaveBeenCalled();
      expect(tenantRepository.deleteTenant).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });
});

describe("WebsiteCustomDomainService.removeCustomDomain", () => {
  const removingRecord = () =>
    buildRecord({ status: "REMOVING", verificationDetails: { tenantId: TENANT.id, reason: "removal_requested" } });

  it("disables the tenant with its current etag and marks a connected domain as being removed", async () => {
    const domainRepository = buildDomainRepository({
      getCustomDomainBySiteId: jest.fn().mockResolvedValue(buildRecord({ status: "ACTIVE" })),
    });
    const { service, tenantRepository, eventRepository } = buildService({ domainRepository });

    const record = await service.removeCustomDomain({ site: SITE, domain: " WWW.Example.com. " });

    expect(tenantRepository.disableTenant).toHaveBeenCalledWith({ tenantId: TENANT.id, etag: TENANT.etag });
    expect(tenantRepository.deleteTenant).not.toHaveBeenCalled();
    expect(domainRepository.deleteDomainById).not.toHaveBeenCalled();
    expect(domainRepository.updateDomainStatusById).toHaveBeenCalledWith(
      "domain-1",
      SITE.id,
      "REMOVING",
      expect.objectContaining({ tenantId: TENANT.id, reason: "removal_requested" })
    );
    expect(domainRepository.updateDomainStatusById.mock.invocationCallOrder[0]).toBeLessThan(
      tenantRepository.disableTenant.mock.invocationCallOrder[0]
    );
    expect(record.status).toBe("REMOVING");
    expect(eventRepository.recordEvent).not.toHaveBeenCalled();
  });

  it("refuses to remove a domain that is no longer the stored one without touching CloudFront", async () => {
    const domainRepository = buildDomainRepository({
      getCustomDomainBySiteId: jest.fn().mockResolvedValue(buildRecord({ status: "ACTIVE", domain: "www.new.com" })),
    });
    const { service, tenantRepository } = buildService({ domainRepository });

    await expect(service.removeCustomDomain({ site: SITE, domain: DOMAIN })).rejects.toMatchObject({
      code: WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_NOT_FOUND,
    });

    expect(tenantRepository.getTenant).not.toHaveBeenCalled();
    expect(tenantRepository.disableTenant).not.toHaveBeenCalled();
    expect(domainRepository.updateDomainStatusById).not.toHaveBeenCalled();
    expect(domainRepository.deleteDomainById).not.toHaveBeenCalled();
  });

  it("just deletes the row for a domain that never got a tenant", async () => {
    const domainRepository = buildDomainRepository({
      getCustomDomainBySiteId: jest
        .fn()
        .mockResolvedValue(buildRecord({ verificationDetails: { tenantId: null, reason: "dns_required" } })),
    });
    const { service, tenantRepository, eventRepository } = buildService({ domainRepository });

    await expect(service.removeCustomDomain({ site: SITE, domain: DOMAIN })).resolves.toBeNull();

    expect(tenantRepository.getTenant).not.toHaveBeenCalled();
    expect(tenantRepository.disableTenant).not.toHaveBeenCalled();
    expect(domainRepository.deleteDomainById).toHaveBeenCalledWith("domain-1", SITE.id);
    expect(eventRepository.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "SITE_DOMAIN_REMOVED",
        payload: { siteId: SITE.id, domain: DOMAIN, previousStatus: "PENDING", tenantId: null },
      })
    );
  });

  it("treats a tenant that is already gone as removed and deletes the row", async () => {
    const domainRepository = buildDomainRepository({
      getCustomDomainBySiteId: jest.fn().mockResolvedValue(buildRecord({ status: "ACTIVE" })),
    });
    const tenantRepository = buildTenantRepository({ getTenant: jest.fn().mockResolvedValue(null) });
    const { service } = buildService({ domainRepository, tenantRepository });

    await expect(service.removeCustomDomain({ site: SITE, domain: DOMAIN })).resolves.toBeNull();

    expect(tenantRepository.disableTenant).not.toHaveBeenCalled();
    expect(tenantRepository.deleteTenant).not.toHaveBeenCalled();
    expect(domainRepository.deleteDomainById).toHaveBeenCalledWith("domain-1", SITE.id);
  });

  it("leaves a removing domain untouched on sync while the disable is still rolling out", async () => {
    const tenantRepository = buildTenantRepository({ getTenant: jest.fn().mockResolvedValue(DISABLED_TENANT) });
    const { service, domainRepository } = buildService({ tenantRepository });

    const record = await service.syncCustomDomain({ site: SITE, domainRecord: removingRecord() });

    expect(record.status).toBe("REMOVING");
    expect(tenantRepository.deleteTenant).not.toHaveBeenCalled();
    expect(tenantRepository.getManagedCertificate).not.toHaveBeenCalled();
    expect(domainRepository.updateDomainStatusById).not.toHaveBeenCalled();
    expect(domainRepository.deleteDomainById).not.toHaveBeenCalled();
  });

  it("deletes the tenant with the post-disable etag and removes the row once the disable is deployed", async () => {
    const tenantRepository = buildTenantRepository({
      getTenant: jest.fn().mockResolvedValue(DISABLED_DEPLOYED_TENANT),
    });
    const { service, domainRepository, eventRepository } = buildService({ tenantRepository });

    await expect(service.syncCustomDomain({ site: SITE, domainRecord: removingRecord() })).resolves.toBeNull();

    expect(tenantRepository.deleteTenant).toHaveBeenCalledWith({ tenantId: TENANT.id, etag: "E3TAG" });
    expect(domainRepository.deleteDomainById).toHaveBeenCalledWith("domain-1", SITE.id);
    expect(eventRepository.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "SITE_DOMAIN_REMOVED",
        payload: expect.objectContaining({ previousStatus: "REMOVING", tenantId: TENANT.id }),
      })
    );
  });

  it("removes the row on sync when the tenant disappeared during removal", async () => {
    const tenantRepository = buildTenantRepository({ getTenant: jest.fn().mockResolvedValue(null) });
    const { service, domainRepository } = buildService({ tenantRepository });

    await expect(service.syncCustomDomain({ site: SITE, domainRecord: removingRecord() })).resolves.toBeNull();

    expect(tenantRepository.deleteTenant).not.toHaveBeenCalled();
    expect(domainRepository.deleteDomainById).toHaveBeenCalledWith("domain-1", SITE.id);
  });

  it("leaves the row on REMOVING when the disable fails and retries the disable on the next sync", async () => {
    const domainRepository = buildDomainRepository({
      getCustomDomainBySiteId: jest.fn().mockResolvedValue(buildRecord({ status: "ACTIVE" })),
    });
    const tenantRepository = buildTenantRepository({
      disableTenant: jest
        .fn()
        .mockRejectedValueOnce(namedError("PreconditionFailed"))
        .mockResolvedValueOnce(DISABLED_TENANT),
    });
    const { service } = buildService({ domainRepository, tenantRepository });

    await expect(service.removeCustomDomain({ site: SITE, domain: DOMAIN })).rejects.toMatchObject({
      code: WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_REMOVE_FAILED,
    });
    expect(domainRepository.updateDomainStatusById).toHaveBeenCalledWith(
      "domain-1",
      SITE.id,
      "REMOVING",
      expect.anything()
    );
    expect(domainRepository.deleteDomainById).not.toHaveBeenCalled();

    const record = await service.syncCustomDomain({ site: SITE, domainRecord: removingRecord() });

    expect(tenantRepository.disableTenant).toHaveBeenCalledTimes(2);
    expect(tenantRepository.disableTenant).toHaveBeenLastCalledWith({ tenantId: TENANT.id, etag: TENANT.etag });
    expect(record.status).toBe("REMOVING");
    expect(tenantRepository.deleteTenant).not.toHaveBeenCalled();
  });

  it("throws DOMAIN_NOT_FOUND when there is nothing to remove", async () => {
    const { service } = buildService();

    await expect(service.removeCustomDomain({ site: SITE, domain: DOMAIN })).rejects.toMatchObject({
      code: WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_NOT_FOUND,
    });
  });

  it("refuses to disable a tenant named for another site and records the error on the row", async () => {
    const domainRepository = buildDomainRepository({
      getCustomDomainBySiteId: jest.fn().mockResolvedValue(buildRecord({ status: "ACTIVE" })),
    });
    const tenantRepository = buildTenantRepository({
      getTenant: jest.fn().mockResolvedValue({ ...TENANT, name: "dbw-site-2" }),
    });
    const { service, eventRepository } = buildService({ domainRepository, tenantRepository });

    await expect(service.removeCustomDomain({ site: SITE, domain: DOMAIN })).rejects.toMatchObject({
      code: WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.TENANT_NOT_OWNED,
      statusCode: 409,
    });

    expect(tenantRepository.disableTenant).not.toHaveBeenCalled();
    expect(tenantRepository.deleteTenant).not.toHaveBeenCalled();
    expect(domainRepository.updateDomainStatusById).not.toHaveBeenCalled();
    expect(domainRepository.deleteDomainById).not.toHaveBeenCalled();
    expect(domainRepository.updateDomainVerificationDetailsById).toHaveBeenCalledWith(
      "domain-1",
      SITE.id,
      expect.objectContaining({ lastError: "tenant_not_owned" })
    );
    expect(eventRepository.recordEvent).not.toHaveBeenCalled();
  });

  it("refuses to delete a tenant named for another site while finishing a removal", async () => {
    const tenantRepository = buildTenantRepository({
      getTenant: jest.fn().mockResolvedValue({ ...DISABLED_DEPLOYED_TENANT, name: "dbw-site-2" }),
    });
    const { service, domainRepository } = buildService({ tenantRepository });

    await expect(service.syncCustomDomain({ site: SITE, domainRecord: removingRecord() })).rejects.toMatchObject({
      code: WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.TENANT_NOT_OWNED,
    });

    expect(tenantRepository.deleteTenant).not.toHaveBeenCalled();
    expect(tenantRepository.disableTenant).not.toHaveBeenCalled();
    expect(domainRepository.deleteDomainById).not.toHaveBeenCalled();
    expect(domainRepository.updateDomainVerificationDetailsById).toHaveBeenCalledWith(
      "domain-1",
      SITE.id,
      expect.objectContaining({ reason: "removal_requested", lastError: "tenant_not_owned" })
    );
  });

  it("still removes a legacy tenant whose name has no dbw- prefix", async () => {
    const tenantRepository = buildTenantRepository({
      getTenant: jest.fn().mockResolvedValue({ ...DISABLED_DEPLOYED_TENANT, name: "developers-test" }),
    });
    const { service, domainRepository } = buildService({ tenantRepository });

    await expect(service.syncCustomDomain({ site: SITE, domainRecord: removingRecord() })).resolves.toBeNull();

    expect(tenantRepository.deleteTenant).toHaveBeenCalledWith({ tenantId: TENANT.id, etag: "E3TAG" });
    expect(domainRepository.deleteDomainById).toHaveBeenCalledWith("domain-1", SITE.id);
  });

  it("treats a row that was already deleted as removed without recording a second event", async () => {
    const domainRepository = buildDomainRepository({
      getCustomDomainBySiteId: jest
        .fn()
        .mockResolvedValue(buildRecord({ verificationDetails: { tenantId: null, reason: "dns_required" } })),
      deleteDomainById: jest.fn().mockResolvedValue(false),
    });
    const { service, eventRepository } = buildService({ domainRepository });

    await expect(service.removeCustomDomain({ site: SITE, domain: DOMAIN })).resolves.toBeNull();

    expect(domainRepository.deleteDomainById).toHaveBeenCalledWith("domain-1", SITE.id);
    expect(eventRepository.recordEvent).not.toHaveBeenCalled();
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
