import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";
import { Forbidden } from "../../functions/PropertyHandler/util/exception/Forbidden.js";
import { NotFoundException } from "../../functions/PropertyHandler/util/exception/NotFoundException.js";
import { TypeException } from "../../functions/PropertyHandler/util/exception/TypeException.js";
import { Unauthorized } from "../../functions/PropertyHandler/util/exception/Unauthorized.js";

const buildEvent = (queryStringParameters, headers = { Authorization: "access-token" }) => ({
  httpMethod: "GET",
  headers,
  queryStringParameters,
});

const parse = (response) => JSON.parse(response.body);

afterEach(() => {
  jest.restoreAllMocks();
});

describe("PropertyController review read endpoints", () => {
  let controller;

  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    controller = new PropertyController();
    controller.authManager = {
      authorizeReviewAdminRequest: jest.fn().mockResolvedValue("admin-1"),
      checkReviewAdminAccess: jest.fn().mockResolvedValue(true),
    };
    controller.propertyService = {
      getReviewQueue: jest.fn().mockResolvedValue({ properties: [{ property: { id: "p1" } }], nextCursor: "next" }),
      getFullPropertyForReview: jest.fn().mockResolvedValue({ property: { id: "p1" } }),
    };
  });

  describe.each([
    ["getReviewAccess", "checkReviewAdminAccess", { allowed: true }, undefined],
    ["getReviewQueue", "authorizeReviewAdminRequest", { properties: [{ property: { id: "p1" } }], nextCursor: "next" }, {}],
    ["getReviewDetail", "authorizeReviewAdminRequest", { property: { id: "p1" } }, { propertyId: "p1" }],
  ])("%s", (method, gate, expectedBody, query) => {
    it("returns 200 with the data and Cache-Control no-store", async () => {
      const response = await controller[method](buildEvent(query));

      expect(response.statusCode).toBe(200);
      expect(parse(response)).toEqual(expectedBody);
      expect(response.headers["Cache-Control"]).toBe("no-store");
      expect(controller.authManager[gate]).toHaveBeenCalledWith("access-token");
    });

    it("accepts the lowercase authorization header", async () => {
      await controller[method](buildEvent(query, { authorization: "lower-token" }));

      expect(controller.authManager[gate]).toHaveBeenCalledWith("lower-token");
    });

    it("returns 401 with no-store for a missing or invalid token", async () => {
      controller.authManager[gate].mockRejectedValue(new Unauthorized("You must be logged in."));

      const response = await controller[method](buildEvent(query, {}));

      expect(response.statusCode).toBe(401);
      expect(console.error).not.toHaveBeenCalled();
      expect(response.headers["Cache-Control"]).toBe("no-store");
      expect(controller.propertyService.getReviewQueue).not.toHaveBeenCalled();
      expect(controller.propertyService.getFullPropertyForReview).not.toHaveBeenCalled();
    });

    it("returns a generic 500 message and no-store for an unexpected failure", async () => {
      controller.authManager[gate].mockRejectedValue(new Error("cognito exploded"));

      const response = await controller[method](buildEvent(query));

      expect(response.statusCode).toBe(500);
      expect(console.error).toHaveBeenCalled();
      expect(response.headers["Cache-Control"]).toBe("no-store");
      expect(response.body).not.toContain("cognito exploded");
    });
  });

  it("access answers 200 allowed false, not 403, for a signed-in non-admin", async () => {
    controller.authManager.checkReviewAdminAccess.mockResolvedValue(false);

    const response = await controller.getReviewAccess(buildEvent());

    expect(response.statusCode).toBe(200);
    expect(parse(response)).toEqual({ allowed: false });
  });

  describe.each([
    ["getReviewQueue", { cursor: "not-a-valid-cursor", limit: "abc" }],
    ["getReviewDetail", { propertyId: "" }],
    ["getReviewDetail", undefined],
  ])("%s for a non-admin", (method, query) => {
    it("returns 403 and never reaches the service, even with invalid input", async () => {
      controller.authManager.authorizeReviewAdminRequest.mockRejectedValue(new Forbidden("no"));

      const response = await controller[method](buildEvent(query));

      expect(response.statusCode).toBe(403);
      expect(response.headers["Cache-Control"]).toBe("no-store");
      expect(controller.propertyService.getReviewQueue).not.toHaveBeenCalled();
      expect(controller.propertyService.getFullPropertyForReview).not.toHaveBeenCalled();
    });
  });

  it("queue copes with a null query string and passes cursor and limit through", async () => {
    await controller.getReviewQueue(buildEvent(null));
    await controller.getReviewQueue(buildEvent({ cursor: "c1", limit: "7" }));

    expect(controller.propertyService.getReviewQueue).toHaveBeenNthCalledWith(1, {
      cursor: undefined,
      limit: undefined,
    });
    expect(controller.propertyService.getReviewQueue).toHaveBeenNthCalledWith(2, { cursor: "c1", limit: "7" });
  });

  it("queue returns the 400 of an invalid cursor", async () => {
    controller.propertyService.getReviewQueue.mockRejectedValue(new TypeException("Invalid cursor."));

    const response = await controller.getReviewQueue(buildEvent({ cursor: "bad" }));

    expect(response.statusCode).toBe(400);
    expect(parse(response)).toEqual({ message: "Invalid cursor." });
  });

  it.each([[undefined], [null], [{}], [{ propertyId: "   " }]])(
    "detail returns 400 without calling the service for the query %j",
    async (query) => {
      const response = await controller.getReviewDetail(buildEvent(query));

      expect(response.statusCode).toBe(400);
      expect(parse(response)).toEqual({ message: "Missing propertyId." });
      expect(controller.propertyService.getFullPropertyForReview).not.toHaveBeenCalled();
    }
  );

  it("detail trims the property id and returns 404 for a missing property", async () => {
    controller.propertyService.getFullPropertyForReview.mockRejectedValue(new NotFoundException("Property x not found."));

    const response = await controller.getReviewDetail(buildEvent({ propertyId: " x " }));

    expect(controller.propertyService.getFullPropertyForReview).toHaveBeenCalledWith("x");
    expect(response.statusCode).toBe(404);
    expect(response.headers["Cache-Control"]).toBe("no-store");
  });
});
