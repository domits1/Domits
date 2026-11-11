import { describe, expect, it, jest } from "@jest/globals";
import { PropertyService } from "../../functions/PropertyHandler/business/service/propertyService.js";

const REJECTED_AT = 1_800_000_000_000;

const buildService = ({ status, rejection = null }) => {
  const service = new PropertyService();
  service.getBasePropertyInfo = jest.fn(async () => ({ id: "property-1", status }));
  service.getFullPropertyAttributesWithFullLocation = jest.fn(async () => ({
    property: { id: "property-1", status },
  }));
  service.propertyRepository = { getLatestRejection: jest.fn(async () => rejection) };
  return service;
};

describe("PropertyService.getFullPropertyByIdAsHost latestRejection", () => {
  it("maps the newest rejection of a REJECTED property to reason and rejectedAt", async () => {
    const service = buildService({
      status: "REJECTED",
      rejection: { reason: "Photos are blurry", createdAt: REJECTED_AT },
    });

    const result = await service.getFullPropertyByIdAsHost("property-1");

    expect(result.latestRejection).toEqual({ reason: "Photos are blurry", rejectedAt: REJECTED_AT });
    expect(service.propertyRepository.getLatestRejection).toHaveBeenCalledWith("property-1");
  });

  it("passes a null reason through as null", async () => {
    const service = buildService({ status: "REJECTED", rejection: { reason: null, createdAt: REJECTED_AT } });

    const result = await service.getFullPropertyByIdAsHost("property-1");

    expect(result.latestRejection).toEqual({ reason: null, rejectedAt: REJECTED_AT });
  });

  it("never exposes the actor of the rejection", async () => {
    const service = buildService({
      status: "REJECTED",
      rejection: { reason: "Photos are blurry", createdAt: REJECTED_AT, actorId: "admin-1" },
    });

    const result = await service.getFullPropertyByIdAsHost("property-1");

    expect(Object.keys(result.latestRejection).sort()).toEqual(["reason", "rejectedAt"]);
    expect(JSON.stringify(result)).not.toContain("admin-1");
  });

  it("returns null for a REJECTED property that has no rejection event", async () => {
    const service = buildService({ status: "REJECTED", rejection: null });

    const result = await service.getFullPropertyByIdAsHost("property-1");

    expect(result.latestRejection).toBeNull();
  });

  it.each(["ACTIVE", "PENDING_REVIEW", "INACTIVE"])(
    "returns null for a %s property without reading the moderation events",
    async (status) => {
      const service = buildService({ status, rejection: { reason: "Old reason", createdAt: REJECTED_AT } });

      const result = await service.getFullPropertyByIdAsHost("property-1");

      expect(result.latestRejection).toBeNull();
      expect(service.propertyRepository.getLatestRejection).not.toHaveBeenCalled();
    }
  );

  it("keeps the rest of the host response", async () => {
    const service = buildService({ status: "ACTIVE" });

    const result = await service.getFullPropertyByIdAsHost("property-1");

    expect(result.property).toEqual({ id: "property-1", status: "ACTIVE" });
  });
});
