import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";

const SITE = {
  id: "site-1",
  propertyId: "property-1",
  hostId: "host-1",
  siteName: "Cliff House",
  status: "PUBLISHED",
  templateKey: "panorama-landing",
  staticPageRevision: 3,
};

const DRAFT = {
  id: "draft-1",
  templateKey: "panorama-landing",
  publishedContentOverrides: { heroEyebrow: "Ubud" },
  publishedThemeOverrides: {},
};

const buildController = () => {
  const siteRepository = {
    upsertSiteWithStaticPageOutbox: jest.fn(async () => SITE),
    upsertSite: jest.fn(async () => SITE),
  };
  const domainRepository = {
    getFallbackDomainBySiteId: jest.fn(async () => null),
    ensureDomain: jest.fn(async () => ({ domain: "cliff-house-site-1.direct.domits.com", status: "ACTIVE" })),
  };
  const controller = new PropertyController();
  controller.directBookingWebsiteSiteRepository = siteRepository;
  controller.directBookingWebsiteDomainRepository = domainRepository;
  controller.propertyService = {
    getFullPropertyAttributesWithFullLocation: jest.fn(async () => ({ property: { id: "property-1" } })),
  };
  controller.ensureDirectBookingWebsitePublishEligibility = jest.fn();
  controller.buildDirectBookingWebsiteName = jest.fn(() => "Cliff House");
  controller.recordStandaloneWebsiteEventSafely = jest.fn(async () => undefined);
  controller.getDirectBookingWebsiteSummaryByPropertyId = jest.fn(async () => ({ siteId: "site-1" }));
  controller.buildDirectBookingWebsiteSummary = jest.fn(() => ({ siteId: "site-1" }));
  return { controller, siteRepository, domainRepository };
};

describe("publishing a website site queues its static page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("stores the site through the transactional upsert that also queues the page", async () => {
    const { controller, siteRepository } = buildController();

    await controller.publishDirectBookingWebsiteForDraft({ draft: DRAFT, hostId: "host-1", propertyId: "property-1" });

    expect(siteRepository.upsertSiteWithStaticPageOutbox).toHaveBeenCalledTimes(1);
    expect(siteRepository.upsertSite).not.toHaveBeenCalled();
    expect(siteRepository.upsertSiteWithStaticPageOutbox).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyId: "property-1",
        hostId: "host-1",
        status: "PUBLISHED",
        templateKey: "panorama-landing",
      })
    );
  });

  it("passes no site id and no revision to the repository, so neither can come from the request", async () => {
    const { controller, siteRepository } = buildController();

    await controller.publishDirectBookingWebsiteForDraft({
      draft: { ...DRAFT, siteId: "site-from-the-request", staticPageRevision: 99 },
      hostId: "host-1",
      propertyId: "property-1",
    });

    const [input] = siteRepository.upsertSiteWithStaticPageOutbox.mock.calls[0];
    expect(input).not.toHaveProperty("siteId");
    expect(input).not.toHaveProperty("revision");
    expect(input).not.toHaveProperty("staticPageRevision");
  });

  it("does not ensure a domain or record an event when the publish and its queued page roll back", async () => {
    const { controller, siteRepository, domainRepository } = buildController();
    siteRepository.upsertSiteWithStaticPageOutbox.mockRejectedValue(new Error("outbox unavailable"));

    await expect(
      controller.publishDirectBookingWebsiteForDraft({ draft: DRAFT, hostId: "host-1", propertyId: "property-1" })
    ).rejects.toThrow("outbox unavailable");

    expect(domainRepository.ensureDomain).not.toHaveBeenCalled();
    expect(controller.recordStandaloneWebsiteEventSafely).not.toHaveBeenCalled();
  });

  it("still publishes when a step after the transaction fails, because the page is already queued", async () => {
    const { controller, domainRepository } = buildController();
    domainRepository.ensureDomain.mockRejectedValue(new Error("domain unavailable"));

    await expect(
      controller.publishDirectBookingWebsiteForDraft({ draft: DRAFT, hostId: "host-1", propertyId: "property-1" })
    ).rejects.toThrow("domain unavailable");
  });
});
