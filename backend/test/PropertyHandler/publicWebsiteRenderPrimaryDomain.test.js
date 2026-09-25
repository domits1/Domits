import { afterEach, describe, expect, it, jest } from "@jest/globals";
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

const renderBySiteId = (controller, siteId) => render(controller, { site: siteId });

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

const silenceConsoleError = () => jest.spyOn(console, "error").mockImplementation(() => {});

afterEach(() => {
  jest.restoreAllMocks();
});

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

  it.each([FALLBACK_NAME, CUSTOM_NAME])(
    "reads the main address by the resolved site id when %s is requested, and ignores another site's flagged row",
    async (requested) => {
      const { controller, domainRepository } = buildController({
        rows: [fallbackRow(), customRow(), otherSiteCustomRow()],
      });

      const { body } = await renderByDomain(controller, requested);

      expect(body.primaryDomain).toEqual({ domain: FALLBACK_NAME, status: "ACTIVE" });
      expect(domainRepository.calls).toEqual([
        ["getDomainByName", requested],
        ["listDomainsBySiteId", SITE.id],
      ]);
    }
  );

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
    const consoleError = silenceConsoleError();

    const { statusCode, body } = await renderByDomain(controller, FALLBACK_NAME);

    expect(statusCode).toBe(200);
    expect(body.primaryDomain).toBeNull();
    expect(body.domain).toEqual(domainRepository.rowById("domain-fallback"));
    expect(body.site.id).toBe(SITE.id);
    expect(consoleError).toHaveBeenCalledTimes(1);
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

  it.each([
    ["the fallback is older", FALLBACK_NAME, { fallbackCreatedAt: 1, customCreatedAt: 2 }],
    ["the fallback is older", CUSTOM_NAME, { fallbackCreatedAt: 1, customCreatedAt: 2 }],
    ["the custom domain is older", FALLBACK_NAME, { fallbackCreatedAt: 2, customCreatedAt: 1 }],
    ["the custom domain is older", CUSTOM_NAME, { fallbackCreatedAt: 2, customCreatedAt: 1 }],
  ])(
    "prefers the live custom domain when both it and the fallback carry the flag, %s and %s is requested",
    async (_order, requested, { fallbackCreatedAt, customCreatedAt }) => {
      const { controller, domainRepository } = buildController({
        rows: [
          fallbackRow({ isPrimary: true, createdAt: fallbackCreatedAt }),
          customRow({ isPrimary: true, createdAt: customCreatedAt }),
        ],
      });

      const { statusCode, body } = await renderByDomain(controller, requested);

      expect(statusCode).toBe(200);
      expect(body.primaryDomain).toEqual({ domain: CUSTOM_NAME, status: "ACTIVE" });
      expect(body.domain).toEqual(storedRowNamed(domainRepository, requested));
    }
  );

  it.each([
    ["the fallback is older", { fallbackCreatedAt: 1, customCreatedAt: 2 }],
    ["the custom domain is older", { fallbackCreatedAt: 2, customCreatedAt: 1 }],
  ])(
    "names the fallback when both it and a custom domain that is not live carry the flag, %s",
    async (_order, { fallbackCreatedAt, customCreatedAt }) => {
      const { controller, domainRepository } = buildController({
        rows: [
          fallbackRow({ isPrimary: true, createdAt: fallbackCreatedAt }),
          customRow({ isPrimary: true, status: "VERIFIED", createdAt: customCreatedAt }),
        ],
      });

      const { statusCode, body } = await renderByDomain(controller, FALLBACK_NAME);

      expect(statusCode).toBe(200);
      expect(body.primaryDomain).toEqual({ domain: FALLBACK_NAME, status: "ACTIVE" });
      expect(body.domain).toEqual(domainRepository.rowById("domain-fallback"));
    }
  );

  describe("when the requested fallback address has no stored row yet", () => {
    const siteRepositoryResolvingFallbackNames = {
      getSiteById: async (siteId) => (siteId === SITE.id ? { ...SITE } : null),
      getPublishedSiteByNormalizedIdPrefix: async (idPrefix) => (idPrefix ? { ...SITE } : null),
    };

    it.each([
      ["answers null when the site has no other row", [], null],
      [
        "names the flagged live custom domain",
        [customRow({ isPrimary: true })],
        { domain: CUSTOM_NAME, status: "ACTIVE" },
      ],
    ])(
      "%s instead of the synthetic fallback when storing the fallback fails",
      async (_label, rows, expectedMainAddress) => {
        await withFallbackRoutingActive(async () => {
          const { controller, domainRepository } = buildController({
            rows,
            siteRepository: siteRepositoryResolvingFallbackNames,
          });
          domainRepository.failNext("ensureDomain", new Error("connection reset"));
          const fallbackName = controller.buildSyntheticPrimaryLiveDomain(SITE).domain;
          silenceConsoleError();

          const { statusCode, body } = await renderByDomain(controller, fallbackName);

          expect(statusCode).toBe(200);
          expect(body.domain.domain).toBe(fallbackName);
          expect(body.domain.isPrimary).toBe(true);
          expect(storedRowNamed(domainRepository, fallbackName)).toBeUndefined();
          expect(body.primaryDomain).toEqual(expectedMainAddress);
        });
      }
    );

    it("names the flagged live custom domain when storing the fallback gives the site a second flagged row", async () => {
      await withFallbackRoutingActive(async () => {
        const { controller, domainRepository } = buildController({
          rows: [customRow({ isPrimary: true })],
          siteRepository: siteRepositoryResolvingFallbackNames,
        });
        const fallbackName = controller.buildSyntheticPrimaryLiveDomain(SITE).domain;

        const { statusCode, body } = await renderByDomain(controller, fallbackName);

        expect(statusCode).toBe(200);
        expect(domainRepository.snapshot().filter((row) => row.isPrimary)).toHaveLength(2);
        expect(body.domain).toEqual(storedRowNamed(domainRepository, fallbackName));
        expect(body.primaryDomain).toEqual({ domain: CUSTOM_NAME, status: "ACTIVE" });
      });
    });
  });
});

describe("public render primaryDomain, resolved by site id", () => {
  it.each([
    ["the fallback carries the flag", [fallbackRow(), customRow()], FALLBACK_NAME, "domain-fallback"],
    [
      "a live custom domain carries the flag",
      [fallbackRow({ isPrimary: false }), customRow({ isPrimary: true })],
      CUSTOM_NAME,
      "domain-custom",
    ],
    [
      "a custom domain that is not live carries the flag",
      [fallbackRow({ isPrimary: false }), customRow({ isPrimary: true, status: "VERIFIED" })],
      FALLBACK_NAME,
      "domain-custom",
    ],
    [
      "no row carries the flag",
      [customRow({ createdAt: 0 }), fallbackRow({ isPrimary: false })],
      FALLBACK_NAME,
      "domain-custom",
    ],
    [
      "both the older fallback and a live custom domain carry the flag",
      [fallbackRow({ createdAt: 1 }), customRow({ isPrimary: true, createdAt: 2 })],
      CUSTOM_NAME,
      "domain-fallback",
    ],
  ])(
    "names the same main address as the domain path when %s, and keeps the flagged or oldest row as domain",
    async (_label, rows, expectedMainAddress, expectedDomainRowId) => {
      const { controller, domainRepository } = buildController({ rows });

      const { statusCode, body } = await renderBySiteId(controller, SITE.id);

      expect(statusCode).toBe(200);
      expect(body.primaryDomain).toEqual({ domain: expectedMainAddress, status: "ACTIVE" });
      expect(body.domain).toEqual(domainRepository.rowById(expectedDomainRowId));
    }
  );

  it("fails the render as before, without guessing a main address, when the site's domain rows cannot be read", async () => {
    const { controller, domainRepository } = buildController({ rows: [fallbackRow(), customRow()] });
    domainRepository.failNext("listDomainsBySiteId", new Error("connection reset"));
    silenceConsoleError();

    const { statusCode, body } = await renderBySiteId(controller, SITE.id);

    expect(statusCode).toBe(500);
    expect(body).not.toHaveProperty("primaryDomain");
    expect(body).not.toHaveProperty("domain");
  });

  it("answers primaryDomain null when the flagged custom domain is not live and the site has no fallback row", async () => {
    const { controller, domainRepository } = buildController({
      rows: [customRow({ isPrimary: true, status: "VERIFIED" })],
    });

    const { statusCode, body } = await renderBySiteId(controller, SITE.id);

    expect(statusCode).toBe(200);
    expect(body.primaryDomain).toBeNull();
    expect(body.domain).toEqual(domainRepository.rowById("domain-custom"));
  });

  it.each([
    ["the fallback carries the flag", [fallbackRow(), customRow()]],
    ["a live custom domain carries the flag", [fallbackRow({ isPrimary: false }), customRow({ isPrimary: true })]],
    [
      "a custom domain that is not live carries the flag",
      [fallbackRow({ isPrimary: false }), customRow({ isPrimary: true, status: "VERIFIED" })],
    ],
    ["no row carries the flag", [fallbackRow({ isPrimary: false }), customRow()]],
  ])("reads the site's domain rows once when %s", async (_label, rows) => {
    const { controller, domainRepository } = buildController({ rows });

    const { statusCode } = await renderBySiteId(controller, SITE.id);

    expect(statusCode).toBe(200);
    expect(domainRepository.calls).toEqual([["listDomainsBySiteId", SITE.id]]);
  });

  it("names the fallback it just stored for a site that had no domain rows", async () => {
    await withFallbackRoutingActive(async () => {
      const { controller, domainRepository } = buildController({ rows: [] });
      const fallbackName = controller.buildSyntheticPrimaryLiveDomain(SITE).domain;

      const { statusCode, body } = await renderBySiteId(controller, SITE.id);

      expect(statusCode).toBe(200);
      expect(body.primaryDomain).toEqual({ domain: fallbackName, status: "ACTIVE" });
      expect(body.domain).toEqual(storedRowNamed(domainRepository, fallbackName));
    });
  });

  it("answers primaryDomain null, not the synthetic fallback, when storing the fallback for a site without rows fails", async () => {
    await withFallbackRoutingActive(async () => {
      const { controller, domainRepository } = buildController({ rows: [] });
      domainRepository.failNext("ensureDomain", new Error("connection reset"));
      const fallbackName = controller.buildSyntheticPrimaryLiveDomain(SITE).domain;
      silenceConsoleError();

      const { statusCode, body } = await renderBySiteId(controller, SITE.id);

      expect(statusCode).toBe(200);
      expect(body.domain.domain).toBe(fallbackName);
      expect(body.domain.isPrimary).toBe(true);
      expect(domainRepository.snapshot()).toEqual([]);
      expect(body.primaryDomain).toBeNull();
    });
  });
});

describe("public render primaryDomain, concurrent domain changes", () => {
  const siteRepositoryRunningBeforeSiteRead = (change) => ({
    getSiteById: async (siteId) => {
      await change();
      return siteId === SITE.id ? { ...SITE } : null;
    },
  });

  it.each([FALLBACK_NAME, CUSTOM_NAME])(
    "answers from the state after a removal of the flagged custom domain that lands after %s was read",
    async (requested) => {
      let domainRepository;
      const built = buildController({
        rows: [fallbackRow({ isPrimary: false }), customRow({ isPrimary: true })],
        siteRepository: siteRepositoryRunningBeforeSiteRead(() =>
          domainRepository.deleteDomainAndRestoreFallbackById("domain-custom", SITE.id)
        ),
      });
      domainRepository = built.domainRepository;
      const requestedRowAsRead = storedRowNamed(domainRepository, requested);

      const { statusCode, body } = await renderByDomain(built.controller, requested);

      expect(statusCode).toBe(200);
      expect(body.primaryDomain).toEqual({ domain: FALLBACK_NAME, status: "ACTIVE" });
      expect(body.domain).toEqual(requestedRowAsRead);
    }
  );

  it("answers from the state after a promotion that lands after the requested fallback was read", async () => {
    let domainRepository;
    const built = buildController({
      rows: [fallbackRow(), customRow()],
      siteRepository: siteRepositoryRunningBeforeSiteRead(() =>
        domainRepository.promoteDomainToPrimary(SITE.id, "domain-custom")
      ),
    });
    domainRepository = built.domainRepository;
    const requestedRowAsRead = domainRepository.rowById("domain-fallback");

    const { statusCode, body } = await renderByDomain(built.controller, FALLBACK_NAME);

    expect(statusCode).toBe(200);
    expect(domainRepository.rowById("domain-custom").isPrimary).toBe(true);
    expect(body.primaryDomain).toEqual({ domain: CUSTOM_NAME, status: "ACTIVE" });
    expect(body.domain).toEqual(requestedRowAsRead);
  });

  it("answers domain and primaryDomain from the same read on the site id path when a promotion lands during the render", async () => {
    const { controller, domainRepository } = buildController({ rows: [fallbackRow(), customRow()] });
    const rowsBeforePromotion = domainRepository.snapshot();
    controller.propertyService = {
      getPublicCalendarAvailability: async () => {
        await domainRepository.promoteDomainToPrimary(SITE.id, "domain-custom");
        return {};
      },
    };

    const { statusCode, body } = await renderBySiteId(controller, SITE.id);

    expect(statusCode).toBe(200);
    expect(domainRepository.rowById("domain-custom").isPrimary).toBe(true);
    expect(body.domain).toEqual(rowsBeforePromotion.find((row) => row.id === "domain-fallback"));
    expect(body.primaryDomain).toEqual({ domain: FALLBACK_NAME, status: "ACTIVE" });
  });
});
