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
});
