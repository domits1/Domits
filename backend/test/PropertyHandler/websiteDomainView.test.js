import { describe, it, expect } from "@jest/globals";
import { toHostWebsiteDomainView } from "../../functions/PropertyHandler/util/websiteDomainView.js";

const CUSTOM_RECORD = {
  id: "domain-1",
  siteId: "site-1",
  domain: "www.example.com",
  domainType: "CUSTOM",
  status: "PENDING",
  isPrimary: false,
  verificationDetails: {
    tenantId: "dt_1",
    tenantName: "dbw-site-1",
    connectionGroupId: "cg_1",
    routingEndpoint: "d3lo.cloudfront.net",
    certificateArn: "arn:cert",
    certificateStatus: "pending-validation",
    dnsVerified: false,
    dnsInstruction: { type: "CNAME", name: "www.example.com", value: "d3lo.cloudfront.net" },
    reason: "certificate_pending",
    lastError: null,
  },
  lastCheckedAt: 1757600000000,
  createdAt: 1757500000000,
  updatedAt: 1757600000000,
};

const FALLBACK_RECORD = {
  ...CUSTOM_RECORD,
  id: "domain-0",
  domain: "villa-abc12345.direct.domits.com",
  domainType: "FALLBACK",
  status: "ACTIVE",
  isPrimary: true,
  verificationDetails: { activationMode: "internal", routingConfigured: true },
};

describe("toHostWebsiteDomainView", () => {
  it("exposes the DNS record and progress of a custom domain without any CloudFront identifiers", () => {
    const view = toHostWebsiteDomainView(CUSTOM_RECORD);

    expect(view).toEqual({
      domain: "www.example.com",
      domainType: "CUSTOM",
      status: "PENDING",
      isPrimary: false,
      dnsRecord: { type: "CNAME", name: "www.example.com", value: "d3lo.cloudfront.net" },
      dnsVerified: false,
      certificateStatus: "pending-validation",
      reason: "certificate_pending",
      lastError: null,
      lastCheckedAt: 1757600000000,
    });
    expect(JSON.stringify(view)).not.toMatch(/dt_1|arn:cert|cg_1|dbw-site-1/);
  });

  it("returns a fallback domain with no DNS work attached", () => {
    expect(toHostWebsiteDomainView(FALLBACK_RECORD)).toEqual({
      domain: "villa-abc12345.direct.domits.com",
      domainType: "FALLBACK",
      status: "ACTIVE",
      isPrimary: true,
      dnsRecord: null,
      dnsVerified: null,
      certificateStatus: null,
      reason: null,
      lastError: null,
      lastCheckedAt: 1757600000000,
    });
  });

  it("maps a missing record to null", () => {
    expect(toHostWebsiteDomainView(null)).toBeNull();
  });
});
