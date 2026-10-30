import { describe, expect, it, jest } from "@jest/globals";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";
import { Unauthorized } from "../../functions/PropertyHandler/util/exception/Unauthorized.js";

const cognitoError = (name, message) => Object.assign(new Error(message), { name });
const HOST_USER = { Username: "host-1", UserAttributes: [{ Name: "custom:group", Value: "Host" }] };

const buildController = (getUserByAccessToken) => {
  const controller = new PropertyController();
  controller.authManager.cognitoRepository = { getUserByAccessToken: jest.fn(getUserByAccessToken) };
  controller.directBookingWebsiteEventRepository = {
    getGlobalKpiSummary: jest.fn().mockResolvedValue({}),
  };
  return controller;
};
const kpiEvent = (Authorization = "token") => ({ httpMethod: "GET", headers: { Authorization } });

describe("checking the access token", () => {
  it.each([
    ["an expired token", cognitoError("NotAuthorizedException", "Access Token has expired")],
    ["a revoked token", cognitoError("NotAuthorizedException", "Access Token has been revoked")],
    ["a deleted user", cognitoError("UserNotFoundException", "User does not exist.")],
    ["a user who must reset the password", cognitoError("PasswordResetRequiredException", "Password reset required")],
    ["an unconfirmed user", cognitoError("UserNotConfirmedException", "User is not confirmed.")],
  ])("rejects %s as a failed login", async (_label, failure) => {
    const { authManager } = buildController(() => Promise.reject(failure));

    const error = await authManager.getAuthorizedUser("token").catch((caught) => caught);

    expect(error).toBeInstanceOf(Unauthorized);
    expect(error.statusCode).toBe(401);
    expect(error.cause).toBe(failure);
  });

  it.each([undefined, ""])("rejects a missing token (%p) without asking Cognito", async (token) => {
    const controller = buildController(() => Promise.resolve(HOST_USER));

    await expect(controller.authManager.getAuthorizedUser(token)).rejects.toBeInstanceOf(Unauthorized);
    expect(controller.authManager.cognitoRepository.getUserByAccessToken).not.toHaveBeenCalled();
  });

  it.each([
    ["a timeout", cognitoError("TimeoutError", "Connection timed out")],
    ["throttling", cognitoError("TooManyRequestsException", "Too many requests")],
    ["a Cognito failure", cognitoError("InternalErrorException", "Internal error")],
  ])("passes %s on instead of calling it a failed login", async (_label, failure) => {
    const { authManager } = buildController(() => Promise.reject(failure));

    await expect(authManager.getAuthorizedUser("token")).rejects.toBe(failure);
  });

  it("answers 401 on a website route for an expired token", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const controller = buildController(() =>
      Promise.reject(cognitoError("NotAuthorizedException", "Access Token has expired"))
    );

    const response = await controller.getWebsiteKpis(kpiEvent());

    expect(response.statusCode).toBe(401);
  });

  it.each([
    ["a timeout", cognitoError("TimeoutError", "Connection timed out")],
    ["throttling", cognitoError("TooManyRequestsException", "Too many requests")],
  ])("keeps the generic 500 on a website route for %s at Cognito", async (_label, failure) => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const controller = buildController(() => Promise.reject(failure));

    const response = await controller.getWebsiteKpis(kpiEvent());

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({
      message: "We could not complete this website request. Please try again.",
    });
  });
});
