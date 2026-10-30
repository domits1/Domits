import { describe, expect, it, jest } from "@jest/globals";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";
import { WebsitePublishNotAllowedError } from "../../functions/PropertyHandler/util/exception/WebsitePublishNotAllowedError.js";

const HOST_ID = "host-1";
const PROPERTY_ID = "property-1";
const DRAFT = { id: "draft-1", templateKey: "panorama-landing", publishedContentOverrides: {}, publishedThemeOverrides: {} };
const SITE = { id: "site-1", propertyId: PROPERTY_ID, hostId: HOST_ID, siteName: "Cliff House", status: "PUBLISHED" };
const NOT_APPROVED_MESSAGE = "Your listing must be approved and live on Domits before you can publish its website.";

const propertyWithStatus = (status) => ({ property: { id: PROPERTY_ID, title: "Cliff House", status } });

describe("ensureDirectBookingWebsitePublishEligibility", () => {
  const controller = new PropertyController();

  it.each(["ACTIVE", "active", "  Active  "])("accepts a listing with status %j", (status) => {
    expect(() => controller.ensureDirectBookingWebsitePublishEligibility(propertyWithStatus(status))).not.toThrow();
  });

  it.each(["INACTIVE", "ARCHIVED", "PENDING_REVIEW", "REJECTED", "", "   ", null, undefined])(
    "rejects a listing with status %j",
    (status) => {
      expect(() => controller.ensureDirectBookingWebsitePublishEligibility(propertyWithStatus(status))).toThrow(
        WebsitePublishNotAllowedError
      );
    }
  );

  it("rejects a listing without a status field", () => {
    expect(() =>
      controller.ensureDirectBookingWebsitePublishEligibility({ property: { id: PROPERTY_ID } })
    ).toThrow(WebsitePublishNotAllowedError);
  });

  it.each([null, undefined, {}, { property: null }, { property: "ACTIVE" }, { property: ["ACTIVE"] }])(
    "rejects missing or malformed listing data %j without treating it as approved",
    (propertyDetails) => {
      expect(() => controller.ensureDirectBookingWebsitePublishEligibility(propertyDetails)).toThrow(
        "Listing data could not be loaded for this live site."
      );
    }
  );
});

const buildController = (propertyDetails) => {
  const controller = new PropertyController();
  controller.authManager = {
    authorizeGroupRequest: jest.fn().mockResolvedValue(HOST_ID),
    authorizeOwnerRequest: jest.fn().mockResolvedValue(undefined),
  };
  controller.directBookingWebsiteDraftRepository = {
    getDraftByPropertyIdAndHostId: jest.fn().mockResolvedValue(DRAFT),
  };
  controller.propertyService = {
    getFullPropertyAttributesWithFullLocation: jest.fn().mockResolvedValue(propertyDetails),
  };
  controller.directBookingWebsiteSiteRepository = {
    upsertSiteWithStaticPageOutbox: jest.fn().mockResolvedValue(SITE),
    upsertSite: jest.fn().mockResolvedValue(SITE),
    getSiteByPropertyIdAndHostId: jest.fn().mockResolvedValue(SITE),
  };
  controller.directBookingWebsiteDomainRepository = {
    getFallbackDomainBySiteId: jest.fn().mockResolvedValue(null),
    ensureDomain: jest.fn().mockResolvedValue({ domain: "cliff-house-site-1.direct.domits.com", status: "ACTIVE" }),
    listDomainsBySiteId: jest.fn().mockResolvedValue([]),
  };
  controller.directBookingWebsiteEventRepository = { recordEvent: jest.fn().mockResolvedValue(undefined) };
  return controller;
};

const publishEvent = () => ({
  httpMethod: "POST",
  headers: { Authorization: "token" },
  body: JSON.stringify({ propertyId: PROPERTY_ID }),
});

describe("POST /property/website/site/publish and the listing status", () => {
  it.each(["INACTIVE", "ARCHIVED", "PENDING_REVIEW", "REJECTED", undefined])(
    "answers 400 with the approval message and writes nothing for a listing with status %j",
    async (status) => {
      const controller = buildController(propertyWithStatus(status));
      const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

      const response = await controller.publishWebsiteSite(publishEvent());

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toEqual({ code: "listing_not_active", message: NOT_APPROVED_MESSAGE });
      expect(controller.directBookingWebsiteSiteRepository.upsertSiteWithStaticPageOutbox).not.toHaveBeenCalled();
      expect(controller.directBookingWebsiteSiteRepository.upsertSite).not.toHaveBeenCalled();
      expect(controller.directBookingWebsiteDomainRepository.ensureDomain).not.toHaveBeenCalled();
      expect(controller.directBookingWebsiteEventRepository.recordEvent).not.toHaveBeenCalled();
      consoleError.mockRestore();
    }
  );

  it("publishes a site for an ACTIVE listing", async () => {
    const controller = buildController(propertyWithStatus("ACTIVE"));

    const response = await controller.publishWebsiteSite(publishEvent());

    expect(response.statusCode).toBe(200);
    expect(controller.directBookingWebsiteSiteRepository.upsertSiteWithStaticPageOutbox).toHaveBeenCalledWith(
      expect.objectContaining({ propertyId: PROPERTY_ID, hostId: HOST_ID, status: "PUBLISHED" })
    );
  });
});
