import { describe, it, expect, jest } from "@jest/globals";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";
import { StaticPageWorker } from "../../functions/PropertyHandler/business/service/staticPageWorker.js";

const SUMMARY = { listed: 1, built: 1, skipped: 0, superseded: 0, notClaimed: 0, failed: 0, errors: [] };

const buildController = (summary) => {
  const controller = new PropertyController();
  const worker = { run: jest.fn(async () => summary) };
  controller.createStaticPageWorker = jest.fn(() => worker);
  return { controller, worker };
};

describe("running the static page worker from the controller", () => {
  it("answers 200 with the run summary, passes the limit on, and 500 when a site could not be finished", async () => {
    const errors = [{ siteId: "site-1", revision: 4, message: "connection lost" }];
    const { controller, worker } = buildController(SUMMARY);

    const response = await controller.buildStaticPages({ task: "build-static-pages", limit: 3 });
    worker.run.mockResolvedValueOnce({ ...SUMMARY, built: 0, errors });
    const failedResponse = await controller.buildStaticPages({ task: "build-static-pages" });

    expect(worker.run).toHaveBeenCalledWith({ limit: 3 });
    expect(response).toEqual({ statusCode: 200, body: JSON.stringify(SUMMARY) });
    expect(failedResponse.statusCode).toBe(500);
    expect(JSON.parse(failedResponse.body).errors).toEqual(errors);
  });

  it("wires the worker to the site and domain repositories the controller already owns", () => {
    process.env.DIRECT_BOOKING_WEBSITE_SITES_BUCKET = "sites-bucket-under-test";
    const controller = new PropertyController();

    const worker = controller.createStaticPageWorker();

    delete process.env.DIRECT_BOOKING_WEBSITE_SITES_BUCKET;
    expect(worker).toBeInstanceOf(StaticPageWorker);
    expect(worker.siteRepository).toBe(controller.directBookingWebsiteSiteRepository);
    expect(worker.domainRepository).toBe(controller.directBookingWebsiteDomainRepository);
  });
});
