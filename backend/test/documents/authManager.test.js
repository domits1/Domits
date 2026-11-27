import { GetUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import { AuthManager } from "../../functions/documents/auth/authManager.js";
import { UnauthorizedException } from "../../functions/documents/util/exception/unauthorizedException.js";

const cognitoError = (name) => Object.assign(new Error(`Cognito answered ${name}`), { name });

const managerAnswering = (answer) => {
  const send = typeof answer === "function" ? jest.fn(answer) : jest.fn().mockResolvedValue(answer);
  return { manager: new AuthManager({ cognitoClient: { send } }), send };
};

const cognitoUser = (attributes, username = "cognito-user-1") => ({
  Username: username,
  UserAttributes: Object.entries(attributes).map(([Name, Value]) => ({ Name, Value })),
});

describe("AuthManager.getUser", () => {
  test.each([undefined, null, ""])("answers 401 for the missing token %p without asking Cognito", async (token) => {
    const { manager, send } = managerAnswering(cognitoUser({}));

    await expect(manager.getUser(token)).rejects.toEqual(new UnauthorizedException("No authorization token provided."));
    expect(send).not.toHaveBeenCalled();
  });

  it("asks Cognito for the user of the access token", async () => {
    const { manager, send } = managerAnswering(cognitoUser({ "custom:group": "Host" }));

    await manager.getUser("access-token-1");

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toBeInstanceOf(GetUserCommand);
    expect(send.mock.calls[0][0].input).toEqual({ AccessToken: "access-token-1" });
  });

  it("returns the Cognito username as the user and the custom:group as the role", async () => {
    const { manager } = managerAnswering(cognitoUser({ email: "a@example.com", "custom:group": "Admin" }));

    await expect(manager.getUser("access-token-1")).resolves.toEqual({ userId: "cognito-user-1", role: "Admin" });
  });

  test.each([
    ["no custom:group", { email: "a@example.com" }],
    ["no attributes", undefined],
  ])("returns no role for a user with %s", async (_label, attributes) => {
    const user = attributes ? cognitoUser(attributes) : { Username: "cognito-user-1" };
    const { manager } = managerAnswering(user);

    await expect(manager.getUser("access-token-1")).resolves.toEqual({ userId: "cognito-user-1", role: null });
  });

  test.each(["NotAuthorizedException", "UserNotFoundException"])(
    "answers 401 when Cognito refuses the token with %s",
    async (name) => {
      const { manager } = managerAnswering(() => Promise.reject(cognitoError(name)));

      await expect(manager.getUser("access-token-1")).rejects.toEqual(
        new UnauthorizedException("Invalid or expired authorization token.")
      );
    }
  );

  test.each(["TooManyRequestsException", "InternalErrorException", "TimeoutError"])(
    "passes %s on as a server failure instead of a 401",
    async (name) => {
      const failure = cognitoError(name);
      const { manager } = managerAnswering(() => Promise.reject(failure));

      const outcome = manager.getUser("access-token-1");

      await expect(outcome).rejects.toBe(failure);
      await expect(outcome).rejects.not.toHaveProperty("statusCode");
    }
  );

  test.each([{}, { Username: "" }, null])("answers 401 when Cognito returns no username: %p", async (answer) => {
    const { manager } = managerAnswering(answer);

    await expect(manager.getUser("access-token-1")).rejects.toMatchObject({ statusCode: 401 });
  });
});
