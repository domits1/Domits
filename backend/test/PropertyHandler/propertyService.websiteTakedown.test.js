import { describe, expect, it, jest } from "@jest/globals";
import { PropertyService } from "../../functions/PropertyHandler/business/service/propertyService.js";
import { WebsiteUnpublisher } from "../../functions/PropertyHandler/business/service/websiteUnpublisher.js";
import { ServiceUnavailableException } from "../../functions/PropertyHandler/util/exception/ServiceUnavailableException.js";

const PROPERTY_ID = "property-1";
const SITE_HOST_ID = "site-host-1";
const PUBLISHED_SITE = { id: "site-1", propertyId: PROPERTY_ID, hostId: SITE_HOST_ID, status: "PUBLISHED" };
const PREVIEW_SITE = { ...PUBLISHED_SITE, status: "PREVIEW" };
const DISABLED_DOMAIN = { domain: "cliff-house-site-1.direct.domits.com", status: "DISABLED" };

const buildService = ({ from = "ACTIVE", site = PUBLISHED_SITE, bookingCount = 0 } = {}) => {
  const service = new PropertyService();
  const calls = [];
  let currentStatus = from;
  let currentSite = site;
  service.getBasePropertyInfo = jest.fn(async () => ({ id: PROPERTY_ID, status: currentStatus }));
  service.propertyRepository = {
    updatePropertyStatus: jest.fn(async (propertyId, status) => {
      calls.push("write status");
      currentStatus = status;
    }),
  };
  service.propertyDeletionRepository = { getBookingCountByPropertyId: jest.fn(async () => bookingCount) };
  service.directBookingWebsiteSiteRepository = {
    getSiteByPropertyId: jest.fn(async () => currentSite),
    updateSiteStatusWithStaticPageOutbox: jest.fn(async () => {
      calls.push("take site down");
      currentSite = PREVIEW_SITE;
      return PREVIEW_SITE;
    }),
  };
  service.directBookingWebsiteDomainRepository = {
    updateFallbackDomainStatus: jest.fn(async () => DISABLED_DOMAIN),
  };
  service.directBookingWebsiteEventRepository = { recordEvent: jest.fn(async () => undefined) };
  service.websiteUnpublisher = new WebsiteUnpublisher({
    siteRepository: service.directBookingWebsiteSiteRepository,
    domainRepository: service.directBookingWebsiteDomainRepository,
    eventRepository: service.directBookingWebsiteEventRepository,
  });
  return { service, calls };
};

const expectSiteTakenDown = (service) => {
  expect(service.directBookingWebsiteSiteRepository.updateSiteStatusWithStaticPageOutbox).toHaveBeenCalledWith(
    PUBLISHED_SITE.id,
    "PREVIEW"
  );
};

const expectNothingTakenDown = (service) => {
  expect(service.directBookingWebsiteSiteRepository.updateSiteStatusWithStaticPageOutbox).not.toHaveBeenCalled();
  expect(service.directBookingWebsiteDomainRepository.updateFallbackDomainStatus).not.toHaveBeenCalled();
  expect(service.directBookingWebsiteEventRepository.recordEvent).not.toHaveBeenCalled();
};

describe("updatePropertyStatus takes the website down when the listing leaves ACTIVE", () => {
  it.each(["INACTIVE", "ARCHIVED"])(
    "takes a PUBLISHED site down on ACTIVE -> %s and still writes the status",
    async (nextStatus) => {
      const { service } = buildService();

      await service.updatePropertyStatus(PROPERTY_ID, nextStatus.toLowerCase());

      expectSiteTakenDown(service);
      expect(service.propertyRepository.updatePropertyStatus).toHaveBeenCalledWith(PROPERTY_ID, nextStatus, {});
    }
  );

  it("takes a legacy PUBLISHED site down on INACTIVE -> ARCHIVED", async () => {
    const { service } = buildService({ from: "INACTIVE" });

    await service.updatePropertyStatus(PROPERTY_ID, "ARCHIVED");

    expectSiteTakenDown(service);
    expect(service.propertyRepository.updatePropertyStatus).toHaveBeenCalledTimes(1);
  });

  it("takes the site down before the property status is written", async () => {
    const { service, calls } = buildService();

    await service.updatePropertyStatus(PROPERTY_ID, "INACTIVE");

    expect(calls).toEqual(["take site down", "write status"]);
  });

  it("records the take-down with the site's own host and the property_not_active reason", async () => {
    const { service } = buildService();

    await service.updatePropertyStatus(PROPERTY_ID, "INACTIVE", { archivedBy: "someone-else" });

    expect(service.directBookingWebsiteEventRepository.recordEvent).toHaveBeenCalledWith({
      draftId: null,
      propertyId: PROPERTY_ID,
      hostId: SITE_HOST_ID,
      eventType: "WEBSITE_SITE_UNPUBLISHED",
      payload: {
        siteId: PUBLISHED_SITE.id,
        domain: DISABLED_DOMAIN.domain,
        domainStatus: "DISABLED",
        reason: "property_not_active",
      },
    });
  });

  it("looks the site up by property id only", async () => {
    const { service } = buildService();

    await service.updatePropertyStatus(PROPERTY_ID, "INACTIVE");

    expect(service.directBookingWebsiteSiteRepository.getSiteByPropertyId).toHaveBeenCalledWith(PROPERTY_ID);
  });

  it("takes the site down on the archive branch of deleteProperty and still reports archived", async () => {
    const { service, calls } = buildService({ bookingCount: 2 });

    const result = await service.deleteProperty(PROPERTY_ID, { actorId: "host-1", reasons: ["sold"] });

    expect(result).toEqual({ result: "archived", propertyId: PROPERTY_ID, bookingCount: 2 });
    expectSiteTakenDown(service);
    expect(calls).toEqual(["take site down", "write status"]);
    expect(service.propertyRepository.updatePropertyStatus).toHaveBeenCalledWith(PROPERTY_ID, "ARCHIVED", {
      archivedBy: "host-1",
      archiveReason: "sold",
    });
  });
});

describe("updatePropertyStatus leaves the website alone when there is nothing to take down", () => {
  it("does nothing to the website when the property has no site", async () => {
    const { service } = buildService({ site: null });

    await service.updatePropertyStatus(PROPERTY_ID, "INACTIVE");

    expectNothingTakenDown(service);
    expect(service.propertyRepository.updatePropertyStatus).toHaveBeenCalledTimes(1);
  });

  it.each(["DRAFT", "PREVIEW", "SUSPENDED"])("leaves a %s site untouched", async (siteStatus) => {
    const { service } = buildService({ site: { ...PUBLISHED_SITE, status: siteStatus } });

    await service.updatePropertyStatus(PROPERTY_ID, "INACTIVE");

    expectNothingTakenDown(service);
    expect(service.propertyRepository.updatePropertyStatus).toHaveBeenCalledTimes(1);
  });

  it("does not look at the website when the status does not change", async () => {
    const { service } = buildService({ from: "INACTIVE" });

    await service.updatePropertyStatus(PROPERTY_ID, "INACTIVE");

    expect(service.directBookingWebsiteSiteRepository.getSiteByPropertyId).not.toHaveBeenCalled();
    expect(service.propertyRepository.updatePropertyStatus).not.toHaveBeenCalled();
  });

  it("does not look at the website when the next status is ACTIVE", async () => {
    const { service } = buildService({ from: "INACTIVE" });

    await service.takeDownWebsiteUnlessActive(PROPERTY_ID, "ACTIVE");

    expect(service.directBookingWebsiteSiteRepository.getSiteByPropertyId).not.toHaveBeenCalled();
    expectNothingTakenDown(service);
  });
});

describe("updatePropertyStatus fails closed when the website cannot be taken down", () => {
  const failWith = (service, mockName, error) => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    mockName(service).mockRejectedValue(error);
    return consoleError;
  };

  it("answers 503 and does not write the status when the site update fails", async () => {
    const { service } = buildService();
    const consoleError = failWith(
      service,
      (target) => target.directBookingWebsiteSiteRepository.updateSiteStatusWithStaticPageOutbox,
      new Error("transaction failed")
    );

    const failure = await service.updatePropertyStatus(PROPERTY_ID, "INACTIVE").catch((error) => error);

    expect(failure).toBeInstanceOf(ServiceUnavailableException);
    expect(failure.statusCode).toBe(503);
    expect(service.propertyRepository.updatePropertyStatus).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("answers 503 and does not write the status when the domain update fails", async () => {
    const { service } = buildService();
    const consoleError = failWith(
      service,
      (target) => target.directBookingWebsiteDomainRepository.updateFallbackDomainStatus,
      new Error("domain write failed")
    );

    await expect(service.updatePropertyStatus(PROPERTY_ID, "ARCHIVED")).rejects.toBeInstanceOf(
      ServiceUnavailableException
    );

    expect(service.propertyRepository.updatePropertyStatus).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("answers 503 and does not write the status when the site lookup fails", async () => {
    const { service } = buildService();
    const consoleError = failWith(
      service,
      (target) => target.directBookingWebsiteSiteRepository.getSiteByPropertyId,
      new Error("lookup failed")
    );

    await expect(service.updatePropertyStatus(PROPERTY_ID, "INACTIVE")).rejects.toBeInstanceOf(
      ServiceUnavailableException
    );

    expect(service.propertyRepository.updatePropertyStatus).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("does not archive a listing with bookings when its website cannot be taken down", async () => {
    const { service } = buildService({ bookingCount: 1 });
    const consoleError = failWith(
      service,
      (target) => target.directBookingWebsiteSiteRepository.updateSiteStatusWithStaticPageOutbox,
      new Error("transaction failed")
    );

    await expect(service.deleteProperty(PROPERTY_ID, { actorId: "host-1" })).rejects.toBeInstanceOf(
      ServiceUnavailableException
    );

    expect(service.propertyRepository.updatePropertyStatus).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("takes down a site published after the first take-down, and answers 503 if that fails", async () => {
    const { service, calls } = buildService({ site: PREVIEW_SITE });
    service.directBookingWebsiteSiteRepository.getSiteByPropertyId
      .mockResolvedValueOnce(PREVIEW_SITE)
      .mockResolvedValue(PUBLISHED_SITE);

    await service.updatePropertyStatus(PROPERTY_ID, "INACTIVE");

    expect(calls).toEqual(["write status", "take site down"]);
    expectSiteTakenDown(service);

    const failing = buildService({ site: PREVIEW_SITE });
    failing.service.directBookingWebsiteSiteRepository.getSiteByPropertyId
      .mockResolvedValueOnce(PREVIEW_SITE)
      .mockResolvedValue(PUBLISHED_SITE);
    const consoleError = failWith(
      failing.service,
      (target) => target.directBookingWebsiteSiteRepository.updateSiteStatusWithStaticPageOutbox,
      new Error("transaction failed")
    );

    const failure = await failing.service.updatePropertyStatus(PROPERTY_ID, "INACTIVE").catch((error) => error);

    expect(failure).toBeInstanceOf(ServiceUnavailableException);
    expect(failure.statusCode).toBe(503);
    expect(failure.message).toContain("status was changed");
    expect(failing.calls).toEqual(["write status"]);
    consoleError.mockRestore();
  });

  it("still takes the site down on a retry after the status write failed", async () => {
    const { service } = buildService();
    service.propertyRepository.updatePropertyStatus.mockRejectedValueOnce(new Error("write failed"));

    await expect(service.updatePropertyStatus(PROPERTY_ID, "INACTIVE")).rejects.toThrow("write failed");
    expectSiteTakenDown(service);

    service.directBookingWebsiteSiteRepository.getSiteByPropertyId.mockResolvedValue(PREVIEW_SITE);
    await service.updatePropertyStatus(PROPERTY_ID, "INACTIVE");

    expect(
      service.directBookingWebsiteSiteRepository.updateSiteStatusWithStaticPageOutbox
    ).toHaveBeenCalledTimes(1);
    expect(service.propertyRepository.updatePropertyStatus).toHaveBeenCalledTimes(2);
  });
});
