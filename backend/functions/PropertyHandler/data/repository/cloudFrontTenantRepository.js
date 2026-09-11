import {
  CloudFrontClient,
  CreateDistributionTenantCommand,
  GetDistributionTenantByDomainCommand,
  GetDistributionTenantCommand,
  GetManagedCertificateDetailsCommand,
  UpdateDistributionTenantCommand,
  VerifyDnsConfigurationCommand,
} from "@aws-sdk/client-cloudfront";

const CLOUDFRONT_REGION = "us-east-1";
const MANAGED_CERTIFICATE_VALIDATION_TOKEN_HOST = "cloudfront";
const DNS_STATUS_UNKNOWN = "unknown-configuration";

const isEntityNotFound = (error) => error?.name === "EntityNotFound";

const mapTenant = (response) => {
  const tenant = response?.DistributionTenant;
  if (!tenant?.Id) {
    return null;
  }

  return {
    etag: response?.ETag || "",
    id: tenant.Id,
    name: tenant.Name || "",
    enabled: tenant.Enabled === true,
    status: tenant.Status || "",
    distributionId: tenant.DistributionId || "",
    connectionGroupId: tenant.ConnectionGroupId || "",
    certificateArn: tenant.Customizations?.Certificate?.Arn || null,
    domains: (Array.isArray(tenant.Domains) ? tenant.Domains : []).map((domainEntry) => ({
      domain: domainEntry?.Domain || "",
      status: domainEntry?.Status || "",
    })),
  };
};

const mapManagedCertificate = (response) => {
  const details = response?.ManagedCertificateDetails;
  if (!details) {
    return null;
  }

  return {
    arn: details.CertificateArn || null,
    status: details.CertificateStatus || "",
    validationTokenHost: details.ValidationTokenHost || "",
  };
};

const nullWhenNotFound = async (request) => {
  try {
    return await request();
  } catch (error) {
    if (isEntityNotFound(error)) {
      return null;
    }
    throw error;
  }
};

export class CloudFrontTenantRepository {
  constructor({ client = new CloudFrontClient({ region: CLOUDFRONT_REGION }) } = {}) {
    this.client = client;
  }

  async createTenant({ name, domain, distributionId, connectionGroupId }) {
    const response = await this.client.send(
      new CreateDistributionTenantCommand({
        Name: name,
        DistributionId: distributionId,
        ConnectionGroupId: connectionGroupId,
        Enabled: true,
        Domains: [{ Domain: domain }],
        ManagedCertificateRequest: {
          ValidationTokenHost: MANAGED_CERTIFICATE_VALIDATION_TOKEN_HOST,
          PrimaryDomainName: domain,
        },
      })
    );
    return mapTenant(response);
  }

  getTenant(tenantId) {
    return nullWhenNotFound(async () =>
      mapTenant(await this.client.send(new GetDistributionTenantCommand({ Identifier: tenantId })))
    );
  }

  getTenantByDomain(domain) {
    return nullWhenNotFound(async () =>
      mapTenant(await this.client.send(new GetDistributionTenantByDomainCommand({ Domain: domain })))
    );
  }

  getManagedCertificate(tenantId) {
    return nullWhenNotFound(async () =>
      mapManagedCertificate(await this.client.send(new GetManagedCertificateDetailsCommand({ Identifier: tenantId })))
    );
  }

  async applyCertificate({ tenantId, etag, certificateArn }) {
    const response = await this.client.send(
      new UpdateDistributionTenantCommand({
        Id: tenantId,
        IfMatch: etag,
        Customizations: { Certificate: { Arn: certificateArn } },
      })
    );
    return mapTenant(response);
  }

  async verifyDns({ tenantId, domain }) {
    const response = await this.client.send(
      new VerifyDnsConfigurationCommand({ Identifier: tenantId, Domain: domain })
    );
    const entry = response?.DnsConfigurationList?.[0];
    return {
      status: entry?.Status || DNS_STATUS_UNKNOWN,
      reason: entry?.Reason || "",
    };
  }
}
