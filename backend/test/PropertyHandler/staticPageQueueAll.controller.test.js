import { describe, it, expect, jest } from "@jest/globals";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";

const buildController = (result) => {
  const controller = new PropertyController();
  controller.directBookingWebsiteSiteRepository = {
    queueStaticPagesForPublishedSites:
      result instanceof Error ? jest.fn().mockRejectedValue(result) : jest.fn(async () => result),
  };
  return controller;
};

describe("queueing every static page from the controller", () => {
  it("queues the published sites through the repository and answers how many", async () => {
    const controller = buildController({ siteIds: ["site-1", "site-2"], complete: true });

    const response = await controller.queueAllStaticPages({ task: "queue-all-static-pages" });

    expect(controller.directBookingWebsiteSiteRepository.queueStaticPagesForPublishedSites).toHaveBeenCalledWith();
    expect(response).toEqual({ statusCode: 200, body: JSON.stringify({ queued: 2, siteIds: ["site-1", "site-2"] }) });
  });

  it("fails the invocation when more sites remain than one run may queue, so the deploy sees it", async () => {
    const controller = buildController({ siteIds: ["site-1"], complete: false });

    await expect(controller.queueAllStaticPages({ task: "queue-all-static-pages" })).rejects.toThrow(
      "Queued 1 sites and stopped"
    );
  });

  it("lets a failed transaction fail the invocation, so the deploy sees it", async () => {
    const controller = buildController(new Error("connection lost"));

    await expect(controller.queueAllStaticPages({ task: "queue-all-static-pages" })).rejects.toThrow("connection lost");
  });
});
