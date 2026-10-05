import { describe, it, expect, jest } from "@jest/globals";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";
import { StaticPageWithdrawal } from "../../functions/PropertyHandler/business/service/staticPageWithdrawal.js";

const SITE = { id: "site-1", propertyId: "property-1", hostId: "host-1", status: "PUBLISHED", staticPageRevision: 3 };
const UNPUBLISHED = { ...SITE, status: "PREVIEW", staticPageRevision: 4 };

const buildController = () => {
  const siteRepository = {
    updateSiteStatusWithStaticPageOutbox: jest.fn(async () => UNPUBLISHED),
    updateSiteStatus: jest.fn(async () => UNPUBLISHED),
  };
  const domainRepository = {
    updateFallbackDomainStatus: jest.fn(async () => ({
      domain: "cliff-house-site-1.direct.domits.com",
      status: "DISABLED",
    })),
    listDomainsBySiteId: jest.fn(async () => []),
  };
  const controller = new PropertyController();
  controller.directBookingWebsiteSiteRepository = siteRepository;
  controller.directBookingWebsiteDomainRepository = domainRepository;
  controller.recordStandaloneWebsiteEventSafely = jest.fn(async () => undefined);
  controller.getDirectBookingWebsiteSummaryByPropertyId = jest.fn(async () => ({ siteId: "site-1" }));
  controller.buildDirectBookingWebsiteSummary = jest.fn(() => ({ siteId: "site-1" }));
  return { controller, siteRepository };
};

describe("unpublishing a website site queues the withdrawal of its page", () => {
  it("moves the site through the transactional status change that also queues the row", async () => {
    const { controller, siteRepository } = buildController();

    await controller.unpublishDirectBookingWebsiteSummary({
      site: SITE,
      draft: { id: "draft-1" },
      hostId: "host-1",
      propertyId: "property-1",
    });

    expect(siteRepository.updateSiteStatusWithStaticPageOutbox).toHaveBeenCalledWith("site-1", "PREVIEW");
    expect(siteRepository.updateSiteStatus).not.toHaveBeenCalled();
  });

  it("fails the unpublish when the status change and the row cannot be written together", async () => {
    const { controller, siteRepository } = buildController();
    siteRepository.updateSiteStatusWithStaticPageOutbox.mockRejectedValueOnce(new Error("outbox unavailable"));

    await expect(
      controller.unpublishDirectBookingWebsiteSummary({
        site: SITE,
        draft: null,
        hostId: "host-1",
        propertyId: "property-1",
      })
    ).rejects.toThrow("outbox unavailable");
  });

  it("gives the worker a withdrawal that shares the page store and talks to the tenants", () => {
    process.env.DIRECT_BOOKING_WEBSITE_SITES_BUCKET = "sites-bucket-under-test";
    const controller = new PropertyController();

    const worker = controller.createStaticPageWorker();

    delete process.env.DIRECT_BOOKING_WEBSITE_SITES_BUCKET;
    expect(worker.withdrawal).toBeInstanceOf(StaticPageWithdrawal);
    expect(worker.withdrawal.pageStore).toBe(worker.pageStore);
    expect(worker.withdrawal.domainRepository).toBe(controller.directBookingWebsiteDomainRepository);
  });
});
