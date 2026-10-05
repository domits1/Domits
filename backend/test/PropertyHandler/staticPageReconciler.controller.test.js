import { describe, it, expect, jest } from "@jest/globals";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";
import { StaticPageReconciler } from "../../functions/PropertyHandler/business/service/staticPageReconciler.js";

const SUMMARY = { stored: 3, expected: 3, removed: 1, queued: 1, stuck: [], errors: [] };

const buildController = (summary) => {
  const controller = new PropertyController();
  const reconciler = { run: jest.fn(async () => summary) };
  controller.createStaticPageReconciler = jest.fn(() => reconciler);
  return { controller, reconciler };
};

describe("running the static page reconciler from the controller", () => {
  it("answers 200 with the summary and passes the requested limit on", async () => {
    const { controller, reconciler } = buildController(SUMMARY);

    const response = await controller.reconcileStaticPages({ task: "reconcile-static-pages", limit: 7 });

    expect(reconciler.run).toHaveBeenCalledWith({ limit: 7 });
    expect(response).toEqual({ statusCode: 200, body: JSON.stringify(SUMMARY) });
  });

  it.each([
    [
      "a removal or a queue failed",
      { ...SUMMARY, errors: [{ hostname: "x.direct.domits.com", message: "AccessDenied" }] },
      "1 failures and 0 stuck",
    ],
    [
      "a site is stuck",
      { ...SUMMARY, stuck: [{ siteId: "site-1", failureReason: "RENDER_FAILED" }] },
      "0 failures and 1 stuck",
    ],
  ])("rejects the run when %s, so the failure reaches the schedule and the alarm", async (_label, summary, message) => {
    const { controller } = buildController(summary);

    await expect(controller.reconcileStaticPages({ task: "reconcile-static-pages" })).rejects.toThrow(message);
  });

  it("wires the reconciler to the repositories the controller owns and to a withdrawal on the same page store", () => {
    process.env.DIRECT_BOOKING_WEBSITE_SITES_BUCKET = "sites-bucket-under-test";
    const controller = new PropertyController();

    const reconciler = controller.createStaticPageReconciler();

    delete process.env.DIRECT_BOOKING_WEBSITE_SITES_BUCKET;
    expect(reconciler).toBeInstanceOf(StaticPageReconciler);
    expect(reconciler.siteRepository).toBe(controller.directBookingWebsiteSiteRepository);
    expect(reconciler.domainRepository).toBe(controller.directBookingWebsiteDomainRepository);
    expect(reconciler.withdrawal.pageStore).toBe(reconciler.pageStore);
  });
});
