import { describe, expect, it } from "@jest/globals";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";
import { createStoringDomainRepository } from "./support/storingDomainRepository.js";

const SITE = {
  id: "site-1",
  propertyId: "property-1",
  hostId: "host-1",
  siteName: "Villa Sol",
  primaryLocale: "en",
  status: "PUBLISHED",
  templateKey: "classic",
  publishedAt: 1756000000000,
  publishedPropertySnapshot: { property: { id: "property-1" } },
  publishedContentOverrides: {},
  publishedThemeOverrides: {},
};
const OTHER_SITE_ID = "site-2";
const FALLBACK_NAME = "villa-sol-site1.direct.domits.com";
const CUSTOM_NAME = "www.villasol.com";

const fallbackRow = (overrides = {}) => ({
  id: "domain-fallback",
  siteId: SITE.id,
  domain: FALLBACK_NAME,
  domainType: "FALLBACK",
  status: "ACTIVE",
  isPrimary: true,
  verificationDetails: { activationMode: "internal", domainKind: "live" },
  lastCheckedAt: 1,
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

const customRow = (overrides = {}) => ({
  id: "domain-custom",
  siteId: SITE.id,
  domain: CUSTOM_NAME,
  domainType: "CUSTOM",
  status: "ACTIVE",
  isPrimary: false,
  verificationDetails: {
    tenantId: "dt_secret_tenant",
    certificateArn: "arn:aws:acm:us-east-1:1:certificate/secret",
    dnsInstruction: { type: "CNAME", name: CUSTOM_NAME, value: "d3lo.cloudfront.net" },
    dnsVerified: true,
  },
  lastCheckedAt: 2,
  createdAt: 2,
  updatedAt: 2,
  ...overrides,
});

const otherSiteCustomRow = () =>
  customRow({ id: "domain-other", siteId: OTHER_SITE_ID, domain: "www.other.com", isPrimary: true });

const buildController = ({ rows, siteRepository } = {}) => {
  const domainRepository = createStoringDomainRepository({ rows });
  const controller = new PropertyController();
  controller.directBookingWebsiteDomainRepository = domainRepository;
  controller.directBookingWebsiteSiteRepository = siteRepository || {
    getSiteById: async (siteId) => (siteId === SITE.id ? { ...SITE } : null),
  };
  controller.directBookingWebsiteEventRepository = { recordEvent: async () => {} };
  controller.propertyService = { getPublicCalendarAvailability: async () => ({}) };
  return { controller, domainRepository };
};

const render = async (controller, query) => {
  const response = await controller.getPublicWebsiteRenderModel({
    httpMethod: "GET",
    headers: {},
    queryStringParameters: query,
  });
  return { statusCode: response.statusCode, body: JSON.parse(response.body) };
};

const renderByDomain = (controller, domain) => render(controller, { domain });

const storedRowNamed = (domainRepository, name) => domainRepository.snapshot().find((row) => row.domain === name);

const withFallbackRoutingActive = async (work) => {
  const previousRouting = process.env.DIRECT_BOOKING_WEBSITE_FALLBACK_ROUTING_ACTIVE;
  process.env.DIRECT_BOOKING_WEBSITE_FALLBACK_ROUTING_ACTIVE = "true";
  try {
    return await work();
  } finally {
    if (previousRouting === undefined) {
      delete process.env.DIRECT_BOOKING_WEBSITE_FALLBACK_ROUTING_ACTIVE;
    } else {
      process.env.DIRECT_BOOKING_WEBSITE_FALLBACK_ROUTING_ACTIVE = previousRouting;
    }
  }
};

describe("public render primaryDomain, resolved by domain", () => {
  it.each([FALLBACK_NAME, CUSTOM_NAME])(
    "names the flagged fallback as main address when %s is requested, and keeps the requested row as domain",
    async (requested) => {
      const { controller, domainRepository } = buildController({ rows: [fallbackRow(), customRow()] });

      const { statusCode, body } = await renderByDomain(controller, requested);

      expect(statusCode).toBe(200);
      expect(body.primaryDomain).toEqual({ domain: FALLBACK_NAME, status: "ACTIVE" });
      expect(body.domain).toEqual(storedRowNamed(domainRepository, requested));
    }
  );

  it.each([FALLBACK_NAME, CUSTOM_NAME])(
    "names a flagged live custom domain as main address when %s is requested, and keeps the requested row as domain",
    async (requested) => {
      const { controller, domainRepository } = buildController({
        rows: [fallbackRow({ isPrimary: false }), customRow({ isPrimary: true })],
      });

      const { statusCode, body } = await renderByDomain(controller, requested);

      expect(statusCode).toBe(200);
      expect(body.primaryDomain).toEqual({ domain: CUSTOM_NAME, status: "ACTIVE" });
      expect(body.domain).toEqual(storedRowNamed(domainRepository, requested));
    }
  );

  it("looks the main address up by the resolved site id and ignores another site's flagged row", async () => {
    const { controller, domainRepository } = buildController({
      rows: [fallbackRow(), customRow(), otherSiteCustomRow()],
    });

    const { body } = await renderByDomain(controller, CUSTOM_NAME);

    expect(body.primaryDomain).toEqual({ domain: FALLBACK_NAME, status: "ACTIVE" });
    expect(domainRepository.calls.filter(([name]) => name === "listDomainsBySiteId")).toEqual([
      ["listDomainsBySiteId", SITE.id],
    ]);
  });

  it("reports the runtime status of the main address and leaves the stored status in domain", async () => {
    await withFallbackRoutingActive(async () => {
      const { controller, domainRepository } = buildController({ rows: [fallbackRow({ status: "PENDING" })] });

      const { statusCode, body } = await renderByDomain(controller, FALLBACK_NAME);

      expect(statusCode).toBe(200);
      expect(body.primaryDomain).toEqual({ domain: FALLBACK_NAME, status: "ACTIVE" });
      expect(body.domain).toEqual(domainRepository.rowById("domain-fallback"));
      expect(body.domain.status).toBe("PENDING");
    });
  });

  it("exposes only the name and status of the main address", async () => {
    const { controller } = buildController({
      rows: [fallbackRow({ isPrimary: false }), customRow({ isPrimary: true })],
    });

    const { body } = await renderByDomain(controller, FALLBACK_NAME);

    expect(body.primaryDomain).toStrictEqual({ domain: CUSTOM_NAME, status: "ACTIVE" });
    const serialized = JSON.stringify(body.primaryDomain);
    ["dt_secret_tenant", "certificate/secret", "d3lo.cloudfront.net", "domain-custom", SITE.id].forEach((secret) =>
      expect(serialized).not.toContain(secret)
    );
  });

  it("answers primaryDomain null, not the fallback, and still renders when the main address lookup fails", async () => {
    const { controller, domainRepository } = buildController({
      rows: [fallbackRow({ isPrimary: false }), customRow({ isPrimary: true })],
    });
    domainRepository.failNext("listDomainsBySiteId", new Error("connection reset"));
    const logged = [];
    const originalConsoleError = console.error;
    console.error = (...args) => logged.push(args);

    try {
      const { statusCode, body } = await renderByDomain(controller, FALLBACK_NAME);

      expect(statusCode).toBe(200);
      expect(body.primaryDomain).toBeNull();
      expect(body.domain).toEqual(domainRepository.rowById("domain-fallback"));
      expect(body.site.id).toBe(SITE.id);
      expect(logged).toHaveLength(1);
    } finally {
      console.error = originalConsoleError;
    }
  });

  it.each(["PENDING", "VERIFIED", "FAILED", "DISABLED", "REMOVING"])(
    "names the fallback as main address when the flagged custom domain is %s, and keeps the requested row as domain",
    async (status) => {
      const { controller, domainRepository } = buildController({
        rows: [fallbackRow({ isPrimary: false }), customRow({ isPrimary: true, status })],
      });

      const { statusCode, body } = await renderByDomain(controller, FALLBACK_NAME);

      expect(statusCode).toBe(200);
      expect(body.primaryDomain).toEqual({ domain: FALLBACK_NAME, status: "ACTIVE" });
      expect(body.domain).toEqual(domainRepository.rowById("domain-fallback"));
    }
  );

  it.each([FALLBACK_NAME, CUSTOM_NAME])(
    "names the fallback as main address when no row of the site carries the flag and %s is requested",
    async (requested) => {
      const { controller, domainRepository } = buildController({
        rows: [fallbackRow({ isPrimary: false }), customRow({ isPrimary: false }), otherSiteCustomRow()],
      });

      const { statusCode, body } = await renderByDomain(controller, requested);

      expect(statusCode).toBe(200);
      expect(body.primaryDomain).toEqual({ domain: FALLBACK_NAME, status: "ACTIVE" });
      expect(body.domain).toEqual(storedRowNamed(domainRepository, requested));
    }
  );

  it.todo("prefers a live custom domain over the fallback when both carry the flag, whichever address was requested");
  it.todo("never takes the main address from a synthetic fallback row");
});

describe("public render primaryDomain, resolved by site id", () => {
  it.todo("names the same main address as the domain path");
  it.todo("keeps the existing domain field unchanged");
  it.todo("answers primaryDomain null when the site has no usable main address");
  it.todo("reads the site's domain rows once");
});
