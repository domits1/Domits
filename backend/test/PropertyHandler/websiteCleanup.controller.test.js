import { describe, expect, it, jest } from "@jest/globals";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";

const TASK = "unpublish-sites-of-inactive-listings";
const candidate = (id) => ({ id, propertyId: `property-${id}`, hostId: `host-${id}`, propertyStatus: "INACTIVE" });

const buildController = ({ candidates = [candidate("site-1")], failingSiteId = null } = {}) => {
  const controller = new PropertyController();
  controller.directBookingWebsiteSiteRepository = {
    listPublishedSitesOfInactiveProperties: jest.fn(async () => ({ sites: candidates, truncated: false })),
    getSiteById: jest.fn(async (id) => ({
      id,
      propertyId: `property-${id}`,
      hostId: `host-${id}`,
      status: "PUBLISHED",
    })),
  };
  controller.propertyService = {
    propertyRepository: { getPropertyById: jest.fn(async (id) => ({ id, status: "INACTIVE" })) },
  };
  const takeDown = jest.fn(async ({ site }) => {
    if (site.id === failingSiteId) {
      throw new Error("outbox write failed");
    }
  });
  controller.createWebsiteUnpublisher = () => ({ takeDown });
  return { controller, takeDown };
};

describe("unpublishSitesOfInactiveListings from the controller", () => {
  it("answers 200 with the summary of a dry run and takes nothing down", async () => {
    const { controller, takeDown } = buildController();

    const response = await controller.unpublishSitesOfInactiveListings({ task: TASK });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({ mode: "dry-run", candidates: 1, unpublished: 0 });
    expect(takeDown).not.toHaveBeenCalled();
  });

  it("keeps a stringified apply a dry run", async () => {
    const { controller, takeDown } = buildController();

    const response = await controller.unpublishSitesOfInactiveListings({ task: TASK, apply: "true" });

    expect(JSON.parse(response.body).mode).toBe("dry-run");
    expect(takeDown).not.toHaveBeenCalled();
  });

  it("answers 200 when apply takes every site down", async () => {
    const { controller, takeDown } = buildController({ candidates: [candidate("site-1"), candidate("site-2")] });

    const response = await controller.unpublishSitesOfInactiveListings({ task: TASK, apply: true, limit: 5 });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({ mode: "apply", unpublished: 2, errors: [] });
    expect(takeDown).toHaveBeenCalledTimes(2);
    expect(controller.directBookingWebsiteSiteRepository.listPublishedSitesOfInactiveProperties).toHaveBeenCalledWith({
      limit: 5,
    });
  });

  it("fails the invocation with the summary when an apply left errors, after trying every site", async () => {
    const { controller, takeDown } = buildController({
      candidates: [candidate("site-1"), candidate("site-2")],
      failingSiteId: "site-1",
    });

    const failure = controller.unpublishSitesOfInactiveListings({ task: TASK, apply: true });

    await expect(failure).rejects.toThrow("The website cleanup left 1 failures");
    await expect(failure).rejects.toThrow("outbox write failed");
    expect(takeDown).toHaveBeenCalledTimes(2);
  });
});
