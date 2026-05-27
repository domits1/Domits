import { CognitoIdentityProviderClient, GetUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import { UnauthorizedException } from "../util/exception/unauthorizedException.js";

const client = new CognitoIdentityProviderClient({ region: "eu-north-1" });

const TEST_USERS_BY_TOKEN = {
  TEST_HOST_TOKEN: {
    UserAttributes: [
      { Name: "sub", Value: "test-host-user" },
      { Name: "email", Value: "host@test.domits" },
      { Name: "custom:group", Value: "Host" },
    ],
  },
};

export class AuthManager {
  async authenticateUser(accessToken) {
    if (!accessToken) {
      throw new UnauthorizedException("No authorization token provided.");
    }

    if (process.env.TEST === "true" && TEST_USERS_BY_TOKEN[accessToken]) {
      const attrs = {};
      TEST_USERS_BY_TOKEN[accessToken].UserAttributes.forEach((a) => {
        attrs[a.Name] = a.Value;
      });
      return attrs;
    }

    try {
      const response = await client.send(new GetUserCommand({ AccessToken: accessToken }));
      const attrs = {};
      response.UserAttributes.forEach((a) => {
        attrs[a.Name] = a.Value;
      });
      return attrs;
    } catch (error) {
      console.error(error);
      throw new UnauthorizedException("Invalid auth token.");
    }
  }
}
