import { describe, expect, it, jest } from "@jest/globals";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";
import { WebsiteUnpublisher } from "../../functions/PropertyHandler/business/service/websiteUnpublisher.js";

const PROPERTY_ID = "property-1";
const PUBLISHED_SITE = { id: "site-1", propertyId: PROPERTY_ID, hostId: "host-1", status: "PUBLISHED" };
const TAKEDOWN_FAILED_MESSAGE =
  "The website of this listing could not be taken offline, so the listing status was not changed. Please try again in a few minutes.";

const buildController = ({ bookingCount = 0 } = {}) => {
  const controller = new PropertyController();
  const service = controller.propertyService;
  controller.authManager = { authorizeOwnerRequest: jest.fn().mockResolvedValue("host-1") };
  service.getBasePropertyInfo = jest.fn().mockResolvedValue({ id: PROPERTY_ID, status: "ACTIVE" });
  service.propertyRepository = { updatePropertyStatus: jest.fn().mockResolvedValue(undefined) };
  service.propertyDeletionRepository = { getBookingCountByPropertyId: jest.fn().mockResolvedValue(bookingCount) };
  service.directBookingWebsiteSiteRepository = {
    getSiteByPropertyId: jest.fn().mockResolvedValue(PUBLISHED_SITE),
    updateSiteStatusWithStaticPageOutbox: jest.fn().mockRejectedValue(new Error("transaction failed")),
  };
  service.websiteUnpublisher = new WebsiteUnpublisher({
    siteRepository: service.directBookingWebsiteSiteRepository,
    domainRepository: { updateFallbackDomainStatus: jest.fn() },
    eventRepository: { recordEvent: jest.fn() },
  });
  return { controller, service };
};

const request = (body) => ({ headers: { Authorization: "token" }, body: JSON.stringify(body) });

describe("a failed website take-down reaches the host as a 503 and leaves the listing status alone", () => {
  it("PATCH /property answers 503 with the take-down message and writes no status", async () => {
    const { controller, service } = buildController();
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    const response = await controller.activateProperty(request({ propertyId: PROPERTY_ID, status: "INACTIVE" }));

    expect(response.statusCode).toBe(503);
    expect(JSON.parse(response.body)).toBe(TAKEDOWN_FAILED_MESSAGE);
    expect(service.propertyRepository.updatePropertyStatus).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("DELETE /property of a listing with bookings answers 503 with the take-down message and does not archive it", async () => {
    const { controller, service } = buildController({ bookingCount: 2 });
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    const response = await controller.delete(request({ propertyId: PROPERTY_ID }));

    expect(response.statusCode).toBe(503);
    expect(JSON.parse(response.body)).toBe(TAKEDOWN_FAILED_MESSAGE);
    expect(service.propertyRepository.updatePropertyStatus).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
