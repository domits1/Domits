import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AuthManager } from "../../functions/PropertyHandler/auth/authManager.js";
import { Forbidden } from "../../functions/PropertyHandler/util/exception/Forbidden.js";
import { Unauthorized } from "../../functions/PropertyHandler/util/exception/Unauthorized.js";

const ENV_NAME = "PROPERTY_REVIEW_ADMIN_USER_IDS";

const buildAuthManager = (getUserByAccessToken) => {
  const authManager = new AuthManager();
  authManager.cognitoRepository = { getUserByAccessToken };
  return authManager;
};

const buildAuthManagerForUser = (user) => buildAuthManager(jest.fn(async () => user));

describe("AuthManager.authorizeReviewAdminRequest", () => {
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

  it("returns the username of an allowlisted caller", async () => {
    const authManager = buildAuthManagerForUser({
      Username: "admin-2",
      UserAttributes: [{ Name: "custom:group", Value: "Host" }],
    });

    await expect(authManager.authorizeReviewAdminRequest("token")).resolves.toBe("admin-2");
  });

  it("does not depend on custom:group for an allowlisted caller", async () => {
    const authManager = buildAuthManagerForUser({ Username: "admin-1", UserAttributes: [] });

    await expect(authManager.authorizeReviewAdminRequest("token")).resolves.toBe("admin-1");
  });

  it("throws Forbidden with status 403 for a valid caller who is not allowlisted", async () => {
    const authManager = buildAuthManagerForUser({
      Username: "host-1",
      UserAttributes: [{ Name: "custom:group", Value: "Host" }],
    });

    const error = await authManager.authorizeReviewAdminRequest("token").catch((caught) => caught);

    expect(error).toBeInstanceOf(Forbidden);
    expect(error.statusCode).toBe(403);
  });

  it.each([
    ["has no UserAttributes", { Username: "host-1" }],
    ["has an empty UserAttributes list", { Username: "host-1", UserAttributes: [] }],
    ["has no Username", { UserAttributes: [{ Name: "custom:group", Value: "Host" }] }],
  ])("throws Forbidden, not a TypeError, when the caller %s", async (_label, user) => {
    const authManager = buildAuthManagerForUser(user);

    await expect(authManager.authorizeReviewAdminRequest("token")).rejects.toBeInstanceOf(Forbidden);
  });

  it.each([undefined, "", "   ", ","])("throws Forbidden for everyone when the allowlist is %j", async (value) => {
    if (value === undefined) {
      delete process.env[ENV_NAME];
    } else {
      process.env[ENV_NAME] = value;
    }
    const authManager = buildAuthManagerForUser({ Username: "admin-1", UserAttributes: [] });

    await expect(authManager.authorizeReviewAdminRequest("token")).rejects.toBeInstanceOf(Forbidden);
  });

  it.each([undefined, "", "invalid-token"])("throws Unauthorized with status 401 for the token %j", async (token) => {
    const cognitoError = new Error("Access Token has expired");
    const authManager = buildAuthManager(
      jest.fn(async () => {
        throw cognitoError;
      })
    );

    const error = await authManager.authorizeReviewAdminRequest(token).catch((caught) => caught);

    expect(error).toBeInstanceOf(Unauthorized);
    expect(error.statusCode).toBe(401);
    expect(error.cause).toBe(cognitoError);
  });
});
