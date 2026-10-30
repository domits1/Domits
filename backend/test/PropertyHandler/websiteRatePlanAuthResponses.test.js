import { describe, expect, it, jest } from "@jest/globals";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";
import { Unauthorized } from "../../functions/PropertyHandler/util/exception/Unauthorized.js";
import { Forbidden } from "../../functions/PropertyHandler/util/exception/Forbidden.js";

const HOST_USER = {
  Username: "host-1",
  UserAttributes: [
    { Name: "custom:group", Value: "Host" },
    { Name: "email", Value: "host@example.test" },
  ],
};

const patchEvent = () => ({
  httpMethod: "PATCH",
  headers: { Authorization: "token" },
  body: JSON.stringify({ plan: "elite" }),
});

const buildController = ({ user = () => Promise.resolve(HOST_USER), changePlan = () => Promise.resolve({}) } = {}) => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  const controller = new PropertyController();
  controller.authManager = {
    getAuthorizedUser: jest.fn(user),
    authorizeGroupRequest: jest.fn(async (accessToken) => (await user(accessToken)).Username),
  };
  controller.directBookingWebsiteRatePlanService = {
    changePlan: jest.fn(changePlan),
    getCurrentPlan: jest.fn(async () => ({ plan: "essentials" })),
  };
  return controller;
};

describe("website rate plan routes and failed authentication", () => {
  it("answers 401 for an expired login on a plan change without changing the plan", async () => {
    const controller = buildController({ user: () => Promise.reject(new Unauthorized("You must be logged in.")) });

    const response = await controller.changeWebsiteRatePlan(patchEvent());

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toBe("You must be logged in.");
    expect(controller.directBookingWebsiteRatePlanService.changePlan).not.toHaveBeenCalled();
  });

  it("answers 500, not 401, when the payment provider rejects the plan change with its own 401", async () => {
    const controller = buildController({
      changePlan: () =>
        Promise.reject(
          Object.assign(new Error("Invalid API Key provided"), { type: "StripeAuthenticationError", statusCode: 401 })
        ),
    });

    const response = await controller.changeWebsiteRatePlan(patchEvent());

    expect(controller.directBookingWebsiteRatePlanService.changePlan).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBe(500);
  });

  it("keeps the status of a plan change that the plan rules refuse", async () => {
    const controller = buildController({
      changePlan: () => Promise.reject(Object.assign(new Error("Elite checkout is disabled."), { statusCode: 503 })),
    });

    const response = await controller.changeWebsiteRatePlan(patchEvent());

    expect(response.statusCode).toBe(503);
    expect(JSON.parse(response.body)).toBe("Elite checkout is disabled.");
  });

  it("answers 403 for a user who is not a host without changing the plan", async () => {
    const controller = buildController({
      user: () => Promise.resolve({ ...HOST_USER, UserAttributes: [{ Name: "custom:group", Value: "Traveler" }] }),
    });

    const response = await controller.changeWebsiteRatePlan(patchEvent());

    expect(response.statusCode).toBe(403);
    expect(controller.directBookingWebsiteRatePlanService.changePlan).not.toHaveBeenCalled();
  });

  it.each([
    [401, new Unauthorized("You must be logged in.")],
    [403, new Forbidden("You must be a Host.")],
  ])("answers %s for a failed login check on reading the plan", async (statusCode, failure) => {
    const controller = buildController({ user: () => Promise.reject(failure) });

    const response = await controller.getWebsiteRatePlan({ httpMethod: "GET", headers: { Authorization: "token" } });

    expect(response.statusCode).toBe(statusCode);
    expect(controller.directBookingWebsiteRatePlanService.getCurrentPlan).not.toHaveBeenCalled();
  });
});
