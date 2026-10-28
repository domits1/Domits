import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AuthManager } from "../../functions/PropertyHandler/auth/authManager.js";
import { Unauthorized } from "../../functions/PropertyHandler/util/exception/Unauthorized.js";

const ENV_NAME = "PROPERTY_REVIEW_ADMIN_USER_IDS";

const buildAuthManager = (getUserByAccessToken) => {
  const authManager = new AuthManager();
  authManager.cognitoRepository = { getUserByAccessToken };
  return authManager;
};

const buildAuthManagerForUser = (user) => buildAuthManager(jest.fn(async () => user));

describe("AuthManager.checkReviewAdminAccess", () => {
  let originalValue;

  beforeEach(() => {
    originalValue = process.env[ENV_NAME];
    process.env[ENV_NAME] = "admin-1,admin-2";
  });

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env[ENV_NAME];
    } else {
      process.env[ENV_NAME] = originalValue;
    }
  });

  it("returns true for an allowlisted caller", async () => {
    const authManager = buildAuthManagerForUser({ Username: "admin-2", UserAttributes: [] });

    await expect(authManager.checkReviewAdminAccess("token")).resolves.toBe(true);
  });

  it("returns false, without throwing, for a valid caller who is not allowlisted", async () => {
    const authManager = buildAuthManagerForUser({
      Username: "host-1",
      UserAttributes: [{ Name: "custom:group", Value: "Host" }],
    });

    await expect(authManager.checkReviewAdminAccess("token")).resolves.toBe(false);
  });

  it("returns false when the caller has no Username", async () => {
    const authManager = buildAuthManagerForUser({ UserAttributes: [] });

    await expect(authManager.checkReviewAdminAccess("token")).resolves.toBe(false);
  });

  it.each([undefined, "", "   ", ","])("returns false for everyone when the allowlist is %j", async (value) => {
    if (value === undefined) {
      delete process.env[ENV_NAME];
    } else {
      process.env[ENV_NAME] = value;
    }
    const authManager = buildAuthManagerForUser({ Username: "admin-1", UserAttributes: [] });

    await expect(authManager.checkReviewAdminAccess("token")).resolves.toBe(false);
  });

  it.each([undefined, ""])("throws Unauthorized with status 401 for the missing token %j", async (token) => {
    const getUserByAccessToken = jest.fn();
    const authManager = buildAuthManager(getUserByAccessToken);

    const error = await authManager.checkReviewAdminAccess(token).catch((caught) => caught);

    expect(error).toBeInstanceOf(Unauthorized);
    expect(error.statusCode).toBe(401);
    expect(getUserByAccessToken).not.toHaveBeenCalled();
  });

  it("throws Unauthorized with status 401 and keeps the cause when Cognito rejects the token", async () => {
    const cognitoError = Object.assign(new Error("Access Token has expired"), { name: "NotAuthorizedException" });
    const authManager = buildAuthManager(
      jest.fn(async () => {
        throw cognitoError;
      })
    );

    const error = await authManager.checkReviewAdminAccess("invalid-token").catch((caught) => caught);

    expect(error).toBeInstanceOf(Unauthorized);
    expect(error.statusCode).toBe(401);
    expect(error.cause).toBe(cognitoError);
  });

  it("passes the access token to Cognito untouched", async () => {
    const getUserByAccessToken = jest.fn(async () => ({ Username: "admin-1" }));
    const authManager = buildAuthManager(getUserByAccessToken);

    await authManager.checkReviewAdminAccess("access-token");

    expect(getUserByAccessToken).toHaveBeenCalledWith("access-token");
  });
});
