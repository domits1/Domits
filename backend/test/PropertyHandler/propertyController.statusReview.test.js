import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";
import { PropertyService } from "../../functions/PropertyHandler/business/service/propertyService.js";
import { ConflictException } from "../../functions/PropertyHandler/util/exception/ConflictException.js";
import { Forbidden } from "../../functions/PropertyHandler/util/exception/Forbidden.js";
import { NotFoundException } from "../../functions/PropertyHandler/util/exception/NotFoundException.js";
import { Unauthorized } from "../../functions/PropertyHandler/util/exception/Unauthorized.js";

const buildEvent = (body, headers = { Authorization: "access-token" }) => ({
  httpMethod: "POST",
  headers,
  body: typeof body === "string" ? body : JSON.stringify(body),
});

const parse = (response) => JSON.parse(response.body);

afterEach(() => {
  jest.restoreAllMocks();
});

describe("PropertyController review endpoints", () => {
  let controller;
  let infoSpy;

  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    controller = new PropertyController();
    controller.authManager = { authorizeReviewAdminRequest: jest.fn().mockResolvedValue("admin-1") };
    controller.propertyService = {
      approveProperty: jest.fn().mockResolvedValue({ id: "property-1", status: "ACTIVE" }),
      rejectProperty: jest.fn().mockResolvedValue({ id: "property-1", status: "REJECTED" }),
    };
  });

  describe.each([
    ["approveProperty", "approve", "approveProperty", "ACTIVE"],
    ["rejectProperty", "reject", "rejectProperty", "REJECTED"],
  ])("%s", (method, action, serviceMethod, resultingStatus) => {
    it("returns 200 with the property id and its new status", async () => {
      const response = await controller[method](buildEvent({ propertyId: "property-1" }));

      expect(response.statusCode).toBe(200);
      expect(parse(response)).toEqual({ propertyId: "property-1", status: resultingStatus });
      expect(controller.authManager.authorizeReviewAdminRequest).toHaveBeenCalledWith("access-token");
      expect(controller.propertyService[serviceMethod]).toHaveBeenCalledWith("property-1");
    });

    it("accepts the lowercase authorization header", async () => {
      await controller[method](buildEvent({ propertyId: "property-1" }, { authorization: "lower-token" }));

      expect(controller.authManager.authorizeReviewAdminRequest).toHaveBeenCalledWith("lower-token");
    });

    it("logs reviewer, property and action, and never the token", async () => {
      await controller[method](buildEvent({ propertyId: "property-1" }));

      expect(infoSpy).toHaveBeenCalledTimes(1);
      const logged = infoSpy.mock.calls[0][0];
      expect(JSON.parse(logged)).toEqual({
        event: "property_review",
        action,
        reviewerId: "admin-1",
        propertyId: "property-1",
        status: resultingStatus,
      });
      expect(logged).not.toContain("access-token");
    });

    it("returns 401 for a missing or invalid token and touches nothing", async () => {
      controller.authManager.authorizeReviewAdminRequest.mockRejectedValue(new Unauthorized("You must be logged in."));

      const response = await controller[method](buildEvent({ propertyId: "property-1" }, {}));

      expect(response.statusCode).toBe(401);
      expect(controller.propertyService[serviceMethod]).not.toHaveBeenCalled();
    });

    it("returns 403 for a caller who is not an admin, without any write", async () => {
      controller.authManager.authorizeReviewAdminRequest.mockRejectedValue(
        new Forbidden("You are not allowed to review properties.")
      );

      const response = await controller[method](buildEvent({ propertyId: "property-1" }));

      expect(response.statusCode).toBe(403);
      expect(controller.propertyService.approveProperty).not.toHaveBeenCalled();
      expect(controller.propertyService.rejectProperty).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
    });

    it("checks the admin before reading the body, so a non-admin learns nothing about validation", async () => {
      controller.authManager.authorizeReviewAdminRequest.mockRejectedValue(new Forbidden("no"));

      const response = await controller[method](buildEvent("{not json"));

      expect(response.statusCode).toBe(403);
    });

    it("returns 409 when the property is not pending review", async () => {
      controller.propertyService[serviceMethod].mockRejectedValue(new ConflictException("Property is ACTIVE."));

      const response = await controller[method](buildEvent({ propertyId: "property-1" }));

      expect(response.statusCode).toBe(409);
      expect(parse(response).message).toBe("Property is ACTIVE.");
      expect(infoSpy).not.toHaveBeenCalled();
    });

    it("returns 404 when the property does not exist", async () => {
      controller.propertyService[serviceMethod].mockRejectedValue(new NotFoundException("Property not found."));

      const response = await controller[method](buildEvent({ propertyId: "missing" }));

      expect(response.statusCode).toBe(404);
    });

    it.each([
      ["a missing propertyId", {}],
      ["an empty propertyId", { propertyId: "  " }],
      ["a non-string propertyId", { propertyId: 42 }],
    ])("returns 400 for %s", async (_label, body) => {
      const response = await controller[method](buildEvent(body));

      expect(response.statusCode).toBe(400);
      expect(controller.propertyService[serviceMethod]).not.toHaveBeenCalled();
    });

    it("returns 400, not 500, for a malformed JSON body", async () => {
      const response = await controller[method](buildEvent("{not json"));

      expect(response.statusCode).toBe(400);
    });

    it("hides the message of an unexpected error behind a 500", async () => {
      controller.propertyService[serviceMethod].mockRejectedValue(new Error("connection string leaked"));

      const response = await controller[method](buildEvent({ propertyId: "property-1" }));

      expect(response.statusCode).toBe(500);
      expect(response.body).not.toContain("connection string leaked");
    });
  });
});

describe("PropertyController.activateProperty (host PATCH)", () => {
  let controller;

  const buildPatch = (body) => buildEvent(body);

  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    controller = new PropertyController();
    controller.authManager = { authorizeOwnerRequest: jest.fn().mockResolvedValue("host-1") };
    controller.propertyService = {
      requestHostStatusChange: jest.fn().mockResolvedValue({ id: "property-1", status: "PENDING_REVIEW" }),
    };
  });

  it("returns 200 with the resulting status for an explicit ACTIVE request", async () => {
    const response = await controller.activateProperty(buildPatch({ propertyId: "property-1", status: "ACTIVE" }));

    expect(response.statusCode).toBe(200);
    expect(parse(response)).toEqual({ status: "PENDING_REVIEW" });
    expect(controller.propertyService.requestHostStatusChange).toHaveBeenCalledWith("property-1", "ACTIVE");
  });

  it("sends the legacy body without a status (what the mobile app sends) to the same method", async () => {
    const response = await controller.activateProperty(buildPatch({ property: "property-1" }));

    expect(response.statusCode).toBe(200);
    expect(controller.propertyService.requestHostStatusChange).toHaveBeenCalledWith("property-1", null);
    expect(parse(response).status).toBe("PENDING_REVIEW");
  });

  it.each(["PENDING_REVIEW", "REJECTED", "DRAFT"])("rejects the host status %s with 400 before any write", async (status) => {
    const response = await controller.activateProperty(buildPatch({ propertyId: "property-1", status }));

    expect(response.statusCode).toBe(400);
    expect(controller.propertyService.requestHostStatusChange).not.toHaveBeenCalled();
  });

  it("still requires the caller to own the property", async () => {
    controller.authManager.authorizeOwnerRequest.mockRejectedValue(new Forbidden("You must be the owner."));

    const response = await controller.activateProperty(buildPatch({ propertyId: "property-1", status: "ACTIVE" }));

    expect(response.statusCode).toBe(403);
    expect(controller.propertyService.requestHostStatusChange).not.toHaveBeenCalled();
  });
});

describe("no direct route to ACTIVE is left", () => {
  it.each(["ACTIVE", "PENDING_REVIEW", "REJECTED"])("updatePropertyStatus refuses %s", async (status) => {
    const service = new PropertyService();
    service.propertyRepository = { updatePropertyStatus: jest.fn(), getPropertyById: jest.fn() };

    await expect(service.updatePropertyStatus("property-1", status)).rejects.toThrow("Invalid property status update.");
    expect(service.propertyRepository.updatePropertyStatus).not.toHaveBeenCalled();
  });

  it.each(["INACTIVE", "ARCHIVED"])("updatePropertyStatus still writes %s, which archive-on-delete needs", async (status) => {
    const service = new PropertyService();
    service.directBookingWebsiteSiteRepository = { getSiteByPropertyId: jest.fn().mockResolvedValue(null) };
    const metadata = { archivedBy: "host-1" };
    service.propertyRepository = {
      updatePropertyStatus: jest.fn(),
      getPropertyById: jest.fn().mockResolvedValueOnce({ status: "PENDING_REVIEW" }).mockResolvedValueOnce({ status }),
    };

    await service.updatePropertyStatus("property-1", status, metadata);

    expect(service.propertyRepository.updatePropertyStatus).toHaveBeenCalledWith("property-1", status, metadata);
  });
});
