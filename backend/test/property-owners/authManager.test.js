const mockSend = jest.fn();

jest.mock("@aws-sdk/client-cognito-identity-provider", () => ({
  CognitoIdentityProviderClient: jest.fn(() => ({ send: mockSend })),
  GetUserCommand: jest.fn((input) => ({ input })),
}));

const { GetUserCommand } = require("@aws-sdk/client-cognito-identity-provider");
const { AuthManager } = require("../../functions/property-owners/auth/authManager.js");
const { UnauthorizedException } = require("../../functions/property-owners/util/exception/unauthorizedException.js");

const ACCESS_TOKEN = "access-token-1";

const cognitoUser = (attributes) => ({
  Username: "host-username-1",
  UserAttributes: Object.entries(attributes).map(([Name, Value]) => ({ Name, Value })),
});

beforeEach(() => {
  mockSend.mockReset();
  GetUserCommand.mockClear();
});

describe("AuthManager.getUser", () => {
  test.each([undefined, null, ""])("rejects a missing token %p with 401 without calling Cognito", async (token) => {
    const failure = new AuthManager().getUser(token);

    await expect(failure).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(failure).rejects.toMatchObject({ statusCode: 401, message: "No authorization token provided." });
    expect(mockSend).not.toHaveBeenCalled();
  });

  test("asks Cognito for the user behind the access token", async () => {
    mockSend.mockResolvedValue(cognitoUser({ "custom:group": "Host" }));

    await new AuthManager().getUser(ACCESS_TOKEN);

    expect(GetUserCommand).toHaveBeenCalledWith({ AccessToken: ACCESS_TOKEN });
    expect(mockSend).toHaveBeenCalledWith({ input: { AccessToken: ACCESS_TOKEN } });
  });

  test("maps the Cognito Username to userId, custom:group to role and the email attribute", async () => {
    mockSend.mockResolvedValue(
      cognitoUser({ sub: "sub-attribute-1", email: "host@example.com", "custom:group": "Host", group: "Traveler" })
    );

    await expect(new AuthManager().getUser(ACCESS_TOKEN)).resolves.toEqual({
      userId: "host-username-1",
      email: "host@example.com",
      role: "Host",
    });
  });

  test("returns a null role when the user has no custom:group", async () => {
    mockSend.mockResolvedValue(cognitoUser({ email: "host@example.com" }));

    await expect(new AuthManager().getUser(ACCESS_TOKEN)).resolves.toMatchObject({ role: null });
  });

  test("returns a null email when the user has no email attribute", async () => {
    mockSend.mockResolvedValue(cognitoUser({ "custom:group": "Admin" }));

    await expect(new AuthManager().getUser(ACCESS_TOKEN)).resolves.toEqual({
      userId: "host-username-1",
      email: null,
      role: "Admin",
    });
  });

  test("turns a Cognito rejection into 401", async () => {
    mockSend.mockRejectedValue(Object.assign(new Error("Access Token has expired"), { name: "NotAuthorizedException" }));

    const failure = new AuthManager().getUser(ACCESS_TOKEN);

    await expect(failure).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(failure).rejects.toMatchObject({
      statusCode: 401,
      message: "Invalid or expired authorization token.",
    });
  });
});
