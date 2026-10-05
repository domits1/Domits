import { describe, it, expect, jest } from "@jest/globals";
import { CloudFrontTenantRepository } from "../../functions/PropertyHandler/data/repository/cloudFrontTenantRepository.js";

const TENANT_RESPONSE = {
  ETag: "E1TAG",
  DistributionTenant: {
    Id: "dt_1",
    Name: "dbw-site-1",
    Enabled: true,
    Status: "Deployed",
    DistributionId: "E18DIST",
    ConnectionGroupId: "cg_1",
    Domains: [{ Domain: "www.example.com", Status: "inactive" }],
  },
};

const buildClient = (responses = {}) => ({
  send: jest.fn(async (command) => {
    const handler = responses[command.constructor.name];
    if (!handler) {
      throw new Error(`Unexpected command ${command.constructor.name}`);
    }
    return typeof handler === "function" ? handler(command.input) : handler;
  }),
});

const sentInput = (client, index = 0) => client.send.mock.calls[index][0].input;

const buildNotFoundError = () => Object.assign(new Error("not found"), { name: "EntityNotFound" });

describe("CloudFrontTenantRepository", () => {
  it("creates an enabled tenant with a cloudfront-hosted managed certificate request", async () => {
    const client = buildClient({ CreateDistributionTenantCommand: TENANT_RESPONSE });
    const repository = new CloudFrontTenantRepository({ client });

    const tenant = await repository.createTenant({
      name: "dbw-site-1",
      domain: "www.example.com",
      distributionId: "E18DIST",
      connectionGroupId: "cg_1",
    });

    expect(sentInput(client)).toEqual({
      Name: "dbw-site-1",
      DistributionId: "E18DIST",
      ConnectionGroupId: "cg_1",
      Enabled: true,
      Domains: [{ Domain: "www.example.com" }],
      ManagedCertificateRequest: { ValidationTokenHost: "cloudfront", PrimaryDomainName: "www.example.com" },
    });
    expect(tenant).toEqual({
      etag: "E1TAG",
      id: "dt_1",
      name: "dbw-site-1",
      enabled: true,
      status: "Deployed",
      distributionId: "E18DIST",
      connectionGroupId: "cg_1",
      certificateArn: null,
      domains: [{ domain: "www.example.com", status: "inactive" }],
    });
  });

  it("applies a certificate by sending only the certificate customization with the etag", async () => {
    const client = buildClient({
      UpdateDistributionTenantCommand: {
        DistributionTenant: {
          ...TENANT_RESPONSE.DistributionTenant,
          Customizations: { Certificate: { Arn: "arn:cert" } },
        },
      },
    });
    const repository = new CloudFrontTenantRepository({ client });

    const tenant = await repository.applyCertificate({ tenantId: "dt_1", etag: "E1TAG", certificateArn: "arn:cert" });

    expect(sentInput(client)).toEqual({
      Id: "dt_1",
      IfMatch: "E1TAG",
      Customizations: { Certificate: { Arn: "arn:cert" } },
    });
    expect(tenant.certificateArn).toBe("arn:cert");
  });

  it("returns null for a missing tenant or certificate and rethrows other errors", async () => {
    const client = buildClient({
      GetDistributionTenantCommand: () => {
        throw buildNotFoundError();
      },
      GetManagedCertificateDetailsCommand: () => {
        throw buildNotFoundError();
      },
      GetDistributionTenantByDomainCommand: () => {
        throw Object.assign(new Error("slow down"), { name: "Throttling" });
      },
    });
    const repository = new CloudFrontTenantRepository({ client });

    await expect(repository.getTenant("dt_missing")).resolves.toBeNull();
    await expect(repository.getManagedCertificate("dt_missing")).resolves.toBeNull();
    await expect(repository.getTenantByDomain("www.example.com")).rejects.toMatchObject({ name: "Throttling" });
  });

  it("maps managed certificate details and dns verification results", async () => {
    const client = buildClient({
      GetManagedCertificateDetailsCommand: {
        ManagedCertificateDetails: {
          CertificateArn: "arn:cert",
          CertificateStatus: "issued",
          ValidationTokenHost: "cloudfront",
        },
      },
      VerifyDnsConfigurationCommand: (input) => ({
        DnsConfigurationList: [{ Domain: input.Domain, Status: "valid-configuration" }],
      }),
    });
    const repository = new CloudFrontTenantRepository({ client });

    await expect(repository.getManagedCertificate("dt_1")).resolves.toEqual({
      arn: "arn:cert",
      status: "issued",
      validationTokenHost: "cloudfront",
    });
    await expect(repository.verifyDns({ tenantId: "dt_1", domain: "www.example.com" })).resolves.toEqual({
      status: "valid-configuration",
      reason: "",
    });
    expect(sentInput(client, 1)).toEqual({ Identifier: "dt_1", Domain: "www.example.com" });
  });

  it("disables a tenant by sending only Enabled false with the etag and returns the new tenant state", async () => {
    const client = buildClient({
      UpdateDistributionTenantCommand: {
        ...TENANT_RESPONSE,
        ETag: "E2TAG",
        DistributionTenant: { ...TENANT_RESPONSE.DistributionTenant, Enabled: false, Status: "InProgress" },
      },
    });
    const repository = new CloudFrontTenantRepository({ client });

    const tenant = await repository.disableTenant({ tenantId: "dt_1", etag: "E1TAG" });

    expect(sentInput(client)).toEqual({ Id: "dt_1", IfMatch: "E1TAG", Enabled: false });
    expect(tenant).toMatchObject({ etag: "E2TAG", enabled: false, status: "InProgress" });
  });

  it("deletes a tenant with the etag and reports an already deleted tenant as null", async () => {
    const client = buildClient({ DeleteDistributionTenantCommand: {} });
    const repository = new CloudFrontTenantRepository({ client });

    await expect(repository.deleteTenant({ tenantId: "dt_1", etag: "E3TAG" })).resolves.toBe(true);
    expect(sentInput(client)).toEqual({ Id: "dt_1", IfMatch: "E3TAG" });

    const goneClient = buildClient({
      DeleteDistributionTenantCommand: () => {
        throw buildNotFoundError();
      },
    });
    await expect(
      new CloudFrontTenantRepository({ client: goneClient }).deleteTenant({ tenantId: "dt_1", etag: "E3TAG" })
    ).resolves.toBeNull();
  });

  it("lists every tenant of a distribution across pages, with the domains each one serves", async () => {
    const pages = [
      { DistributionTenantList: [{ Id: "dt_1", Domains: [{ Domain: "*.direct.domits.com" }] }], NextMarker: "m2" },
      { DistributionTenantList: [{ Id: "dt_2", Domains: [{ Domain: "www.example.com" }] }, { Domains: [] }] },
    ];
    const client = buildClient({ ListDistributionTenantsCommand: () => pages.shift() });
    const repository = new CloudFrontTenantRepository({ client });

    const tenants = await repository.listTenantsForDistribution("E18DIST");

    expect(sentInput(client, 0)).toEqual({ AssociationFilter: { DistributionId: "E18DIST" }, Marker: undefined });
    expect(sentInput(client, 1)).toEqual({ AssociationFilter: { DistributionId: "E18DIST" }, Marker: "m2" });
    expect(tenants).toEqual([
      { id: "dt_1", domains: ["*.direct.domits.com"] },
      { id: "dt_2", domains: ["www.example.com"] },
    ]);
  });

  it("invalidates the given paths on one tenant and answers the invalidation id", async () => {
    const client = buildClient({ CreateInvalidationForDistributionTenantCommand: { Invalidation: { Id: "I1" } } });
    const repository = new CloudFrontTenantRepository({ client });

    const id = await repository.createInvalidation({
      tenantId: "dt_1",
      paths: ["/sites/by-host/www.example.com/index.html", "/"],
      callerReference: "withdraw-1",
    });

    expect(sentInput(client)).toEqual({
      Id: "dt_1",
      InvalidationBatch: {
        Paths: { Quantity: 2, Items: ["/sites/by-host/www.example.com/index.html", "/"] },
        CallerReference: "withdraw-1",
      },
    });
    expect(id).toBe("I1");
  });
});
