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
  publishedPropertySnapshot: {
    property: {
      id: "property-1",
      hostId: "host-secret-1",
      title: "Villa Sensual",
      createdAt: 1757400000000,
      updatedAt: 1757500000000,
    },
  },
  publishedContentOverrides: {},
  publishedThemeOverrides: {},
  previewTokenHash: "preview-secret",
  publishedAt: 1757600000000,
  suspendedAt: null,
  createdAt: 1757500000000,
  updatedAt: 1757600000000,
  futureSiteColumn: "must never reach a visitor",
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

const STORED_FALLBACK_DOMAIN = {
  ...STORED_DOMAIN,
  id: "domain-0",
  domain: "villa-sensual-site1.direct.domits.com",
  domainType: "FALLBACK",
  status: "PENDING",
  verificationDetails: { activationMode: "internal", domainKind: "live", routingConfigured: false },
};

const PUBLIC_DOMAIN = { domain: STORED_DOMAIN.domain, status: "ACTIVE", isPrimary: true };
const PUBLIC_FALLBACK_DOMAIN = { domain: STORED_FALLBACK_DOMAIN.domain, status: "ACTIVE", isPrimary: true };

const PUBLIC_SITE = {
  id: SITE.id,
  siteName: SITE.siteName,
  primaryLocale: SITE.primaryLocale,
  status: SITE.status,
  templateKey: SITE.templateKey,
};

const buildPublicResolution = (domain) => ({
  siteId: SITE.id,
  propertyId: SITE.propertyId,
  templateKey: SITE.templateKey,
  primaryLocale: SITE.primaryLocale,
  siteName: SITE.siteName,
  siteStatus: SITE.status,
  publishedAt: SITE.publishedAt,
  isReachable: true,
  domain,
});

const PRIVATE_MARKERS = [
  "hostId",
  SITE.hostId,
  "previewTokenHash",
  SITE.previewTokenHash,
  "suspendedAt",
  "futureSiteColumn",
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
  "domain-0",
  "calendarUrl",
  "ical.example",
];

const buildController = ({ site = SITE, domain = STORED_DOMAIN, domains = [domain] } = {}) => {
  const controller = new PropertyController();
  controller.directBookingWebsiteSiteRepository = { getSiteById: jest.fn().mockResolvedValue(site) };
  controller.directBookingWebsiteDomainRepository = {
    getDomainByName: jest.fn().mockResolvedValue(domain),
    listDomainsBySiteId: jest.fn().mockResolvedValue(domains),
  };
  controller.directBookingWebsiteEventRepository = { recordEvent: jest.fn().mockResolvedValue(undefined) };
  controller.propertyService = { getPublicCalendarAvailability: jest.fn().mockResolvedValue(CALENDAR_AVAILABILITY) };
  controller.websitePublicHostService = { loadPublicHost: jest.fn().mockResolvedValue(PUBLIC_HOST) };
  return controller;
};

const CALENDAR_AVAILABILITY = {
  externalBlockedDates: ["2026-10-10"],
  availableDateKeys: [],
  unavailableDateKeys: [],
  hasExternalCalendarSync: true,
  syncedSourceCount: 1,
  lastSyncAt: 1791000000000,
  syncSources: [{ name: "Airbnb", calendarUrl: "https://ical.example/hosts/host-secret-1/property-1.ics" }],
};

const PUBLIC_HOST = {
  displayName: "Karim",
  profileImage: "https://cdn.example/karim.jpg",
  whatsapp: { isAvailable: true, phoneNumber: "+31 6 1234 5678", phoneNumberDigits: "31612345678" },
};

const EMPTY_PUBLIC_HOST = {
  displayName: "",
  profileImage: "",
  whatsapp: { isAvailable: false, phoneNumber: "", phoneNumberDigits: "" },
};

const buildEvent = (query) => ({
  httpMethod: "GET",
  headers: {},
  queryStringParameters: query,
  requestContext: { requestId: "req-1" },
});

const parseBody = (response) => JSON.parse(response.body);

const expectNoPrivateMarker = (text) => {
  for (const marker of PRIVATE_MARKERS) {
    expect(text).not.toContain(marker);
  }
};

const expectPublicRenderResponse = (response, domain, requestedDomain = domain) => {
  expect(response.statusCode).toBe(200);
  const body = parseBody(response);
  expect(body.site).toEqual(PUBLIC_SITE);
  expect(body.resolution).toEqual(buildPublicResolution(domain));
  expect(body.domain).toEqual(requestedDomain);
  expect(body.renderSource).toBe("published_site");
  expect(body.host).toEqual(PUBLIC_HOST);
  const { syncSources, ...publicCalendarAvailability } = CALENDAR_AVAILABILITY;
  expect(body.propertySnapshot).toEqual({
    property: { id: SITE.propertyId, title: SITE.publishedPropertySnapshot.property.title },
    calendarAvailability: publicCalendarAvailability,
  });
  expectNoPrivateMarker(JSON.stringify(body));
};

describe("the public website render response", () => {
  it("carries only the public site and domain fields when rendered by domain", async () => {
    const controller = buildController();

    const response = await controller.getPublicWebsiteRenderModel(buildEvent({ domain: STORED_DOMAIN.domain }));

    expectPublicRenderResponse(response, PUBLIC_DOMAIN);
    expect(controller.directBookingWebsiteDomainRepository.getDomainByName).toHaveBeenCalledWith(STORED_DOMAIN.domain);
  });

  it("carries only the public site and domain fields when rendered by site id", async () => {
    const controller = buildController();

    const response = await controller.getPublicWebsiteRenderModel(buildEvent({ site: SITE.id }));

    expectPublicRenderResponse(response, PUBLIC_DOMAIN);
    expect(controller.directBookingWebsiteDomainRepository.listDomainsBySiteId).toHaveBeenCalledWith(SITE.id);
  });

  it("carries only the public site and domain fields when the by-id path has to heal the primary domain", async () => {
    const controller = buildController({ domains: [] });
    controller.resolveOrCreatePrimaryLiveDomain = jest.fn().mockResolvedValue(STORED_DOMAIN);

    const response = await controller.getPublicWebsiteRenderModel(buildEvent({ site: SITE.id }));

    expectPublicRenderResponse(response, PUBLIC_DOMAIN);
    expect(controller.resolveOrCreatePrimaryLiveDomain).toHaveBeenCalledWith(SITE);
  });

  it("asks the host block for the site's own host and never for an id from the request", async () => {
    const controller = buildController();

    await controller.getPublicWebsiteRenderModel(
      buildEvent({ domain: STORED_DOMAIN.domain, hostId: "host-from-request", propertyId: "property-from-request" })
    );

    expect(controller.websitePublicHostService.loadPublicHost).toHaveBeenCalledTimes(1);
    expect(controller.websitePublicHostService.loadPublicHost).toHaveBeenCalledWith(SITE.hostId);
    expect(controller.propertyService.getPublicCalendarAvailability).toHaveBeenCalledWith(SITE.propertyId);
  });

  it("still renders, with an empty host block, when the host lookup throws", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    const controller = buildController();
    controller.websitePublicHostService.loadPublicHost.mockRejectedValue(new Error("Cognito is down"));

    const response = await controller.getPublicWebsiteRenderModel(buildEvent({ domain: STORED_DOMAIN.domain }));

    expect(response.statusCode).toBe(200);
    const body = parseBody(response);
    expect(body.host).toEqual(EMPTY_PUBLIC_HOST);
    expect(body.site).toEqual(PUBLIC_SITE);
    expectNoPrivateMarker(JSON.stringify(body));
    consoleError.mockRestore();
  });

  it("sends the runtime status of a fallback domain in the resolution and the stored one in the requested row", async () => {
    const previousRoutingFlag = process.env.DIRECT_BOOKING_WEBSITE_FALLBACK_ROUTING_ACTIVE;
    process.env.DIRECT_BOOKING_WEBSITE_FALLBACK_ROUTING_ACTIVE = "true";
    try {
      const controller = buildController({ domain: STORED_FALLBACK_DOMAIN });

      const response = await controller.getPublicWebsiteRenderModel(buildEvent({ domain: STORED_FALLBACK_DOMAIN.domain }));

      expectPublicRenderResponse(response, PUBLIC_FALLBACK_DOMAIN, { ...PUBLIC_FALLBACK_DOMAIN, status: "PENDING" });
    } finally {
      if (previousRoutingFlag === undefined) {
        delete process.env.DIRECT_BOOKING_WEBSITE_FALLBACK_ROUTING_ACTIVE;
      } else {
        process.env.DIRECT_BOOKING_WEBSITE_FALLBACK_ROUTING_ACTIVE = previousRoutingFlag;
      }
    }
  });
});

describe("the public website resolve response", () => {
  it("carries only the public site and domain fields", async () => {
    const controller = buildController();

    const response = await controller.resolvePublicWebsiteSite(buildEvent({ domain: STORED_DOMAIN.domain }));

    expect(response.statusCode).toBe(200);
    expect(parseBody(response)).toEqual(buildPublicResolution(PUBLIC_DOMAIN));
    expectNoPrivateMarker(response.body);
  });
});
