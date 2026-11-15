import { describe, expect, it, jest } from "@jest/globals";
import { AuthManager } from "../../functions/PropertyHandler/auth/authManager.js";
import { NotFoundException } from "../../functions/PropertyHandler/util/exception/NotFoundException.js";

const buildAuthManager = (getUserById) => {
  const authManager = new AuthManager();
  authManager.cognitoRepository = { getUserById };
  return authManager;
};

describe("AuthManager.getUserInfoFromId", () => {
  it("answers 404 when Cognito has no such user", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const authManager = buildAuthManager(jest.fn().mockRejectedValue(new NotFoundException("User not found.")));

    const error = await authManager.getUserInfoFromId("unknown-user-id").catch((caught) => caught);

    expect(error).toBeInstanceOf(NotFoundException);
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe("Could not request the property's userid.");
  });
});
