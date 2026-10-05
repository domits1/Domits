import { describe, expect, it, jest } from "@jest/globals";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";

const SITE = {
  id: "site-1",
  propertyId: "property-1",
  hostId: "host-secret-1",
  siteName: "Villa Sensual",
  primaryLocale: "nl",
  status: "PUBLISHED",
  templateKey: "panorama-landing",
  publishedAt: 1757600000000,
  publishedPropertySnapshot: { property: { id: "property-1", title: "Villa Sensual" } },
  publishedContentOverrides: {},
  publishedThemeOverrides: {},
};

const STORED_DOMAIN = {
  id: "domain-1",
  siteId: SITE.id,
  domain: "www.villasensual.nl",
  domainType: "CUSTOM",
  status: "ACTIVE",
  isPrimary: true,
  verificationDetails: {
    tenantId: "dt_secret",
    tenantName: "dbw-site-1",
    connectionGroupId: "cg_secret",
    routingEndpoint: "d3lo.cloudfront.net",
    certificateArn: "arn:aws:acm:secret",
    certificateStatus: "issued",
    dnsVerified: true,
    dnsInstruction: { type: "CNAME", name: "www.villasensual.nl", value: "d3lo.cloudfront.net" },
    reason: "certificate_applied",
    lastError: null,
  },
  lastCheckedAt: 1757600000000,
  createdAt: 1757500000000,
  updatedAt: 1757600000000,
  futureColumn: "must never reach a visitor",
};

const PUBLIC_DOMAIN = { domain: "www.villasensual.nl", status: "ACTIVE", isPrimary: true };

const PRIVATE_MARKERS = [
  "hostId",
  SITE.hostId,
  "verificationDetails",
  "dt_secret",
  "cg_secret",
  "arn:aws:acm:secret",
  "cloudfront.net",
  "futureColumn",
  "lastCheckedAt",
  "createdAt",
  "updatedAt",
  "domain-1",
];

const STORED_FALLBACK_DOMAIN = {
  ...STORED_DOMAIN,
  id: "domain-0",
  domain: "villa-sensual-site1.direct.domits.com",
  domainType: "FALLBACK",
  status: "PENDING",
  verificationDetails: { activationMode: "internal", domainKind: "live", routingConfigured: false },
};

const buildController = ({ site = SITE, domain = STORED_DOMAIN, domains = [domain] } = {}) => {
  const controller = new PropertyController();
  controller.directBookingWebsiteSiteRepository = { getSiteById: jest.fn().mockResolvedValue(site) };
  controller.directBookingWebsiteDomainRepository = {
    getDomainByName: jest.fn().mockResolvedValue(domain),
    listDomainsBySiteId: jest.fn().mockResolvedValue(domains),
  };
  controller.directBookingWebsiteEventRepository = { recordEvent: jest.fn().mockResolvedValue(undefined) };
  controller.propertyService = { getPublicCalendarAvailability: jest.fn().mockResolvedValue([]) };
  return controller;
};

const buildEvent = (query) => ({
  httpMethod: "GET",
  headers: {},
  queryStringParameters: query,
  requestContext: { requestId: "req-1" },
});

const parseBody = (response) => JSON.parse(response.body);

const expectOnlyPublicDomainFields = (response) => {
  expect(response.statusCode).toBe(200);
  const body = parseBody(response);
  expect(body.domain).toEqual(PUBLIC_DOMAIN);
  expect(body.resolution.domain).toEqual(PUBLIC_DOMAIN);
  for (const marker of PRIVATE_MARKERS) {
    expect(response.body).not.toContain(marker);
  }
};

describe("the public website render response", () => {
  it("carries only the public domain fields when rendered by domain", async () => {
    const controller = buildController();

    const response = await controller.getPublicWebsiteRenderModel(buildEvent({ domain: STORED_DOMAIN.domain }));

    expectOnlyPublicDomainFields(response);
    expect(controller.directBookingWebsiteDomainRepository.getDomainByName).toHaveBeenCalledWith(STORED_DOMAIN.domain);
  });

  it("carries only the public domain fields when rendered by site id", async () => {
    const controller = buildController();

    const response = await controller.getPublicWebsiteRenderModel(buildEvent({ site: SITE.id }));

    expectOnlyPublicDomainFields(response);
    expect(controller.directBookingWebsiteDomainRepository.listDomainsBySiteId).toHaveBeenCalledWith(SITE.id);
  });

  it("sends the runtime status of a fallback domain, not the stored one, in both places", async () => {
    const previousRoutingFlag = process.env.DIRECT_BOOKING_WEBSITE_FALLBACK_ROUTING_ACTIVE;
    process.env.DIRECT_BOOKING_WEBSITE_FALLBACK_ROUTING_ACTIVE = "true";
    try {
      const controller = buildController({ domain: STORED_FALLBACK_DOMAIN });

      const response = await controller.getPublicWebsiteRenderModel(buildEvent({ domain: STORED_FALLBACK_DOMAIN.domain }));

      expect(response.statusCode).toBe(200);
      const body = parseBody(response);
      const expectedDomain = { domain: STORED_FALLBACK_DOMAIN.domain, status: "ACTIVE", isPrimary: true };
      expect(body.domain).toEqual(expectedDomain);
      expect(body.resolution.domain).toEqual(expectedDomain);
      expect(response.body).not.toContain("verificationDetails");
    } finally {
      if (previousRoutingFlag === undefined) {
        delete process.env.DIRECT_BOOKING_WEBSITE_FALLBACK_ROUTING_ACTIVE;
      } else {
        process.env.DIRECT_BOOKING_WEBSITE_FALLBACK_ROUTING_ACTIVE = previousRoutingFlag;
      }
    }
  });

  it("carries only the public domain fields when the by-id path has to heal the primary domain", async () => {
    const controller = buildController({ domains: [] });
    controller.resolveOrCreatePrimaryLiveDomain = jest.fn().mockResolvedValue(STORED_DOMAIN);

    const response = await controller.getPublicWebsiteRenderModel(buildEvent({ site: SITE.id }));

    expectOnlyPublicDomainFields(response);
    expect(controller.resolveOrCreatePrimaryLiveDomain).toHaveBeenCalledWith(SITE);
  });

  it("keeps the site fields the public page reads, and nothing else", async () => {
    const controller = buildController();

    const body = parseBody(await controller.getPublicWebsiteRenderModel(buildEvent({ site: SITE.id })));

    expect(body.site).toEqual({
      id: SITE.id,
      siteName: SITE.siteName,
      primaryLocale: SITE.primaryLocale,
      status: SITE.status,
      templateKey: SITE.templateKey,
    });
    expect(body.resolution).toEqual({
      siteId: SITE.id,
      propertyId: SITE.propertyId,
      templateKey: SITE.templateKey,
      primaryLocale: SITE.primaryLocale,
      siteName: SITE.siteName,
      siteStatus: SITE.status,
      publishedAt: SITE.publishedAt,
      isReachable: true,
      domain: PUBLIC_DOMAIN,
    });
    expect(body.renderSource).toBe("published_site");
  });
});

describe("the public website resolve response", () => {
  it("carries only the public domain fields", async () => {
    const controller = buildController();

    const response = await controller.resolvePublicWebsiteSite(buildEvent({ domain: STORED_DOMAIN.domain }));

    expect(response.statusCode).toBe(200);
    const body = parseBody(response);
    expect(body.domain).toEqual(PUBLIC_DOMAIN);
    expect(body.isReachable).toBe(true);
    for (const marker of PRIVATE_MARKERS) {
      expect(response.body).not.toContain(marker);
    }
  });
});
