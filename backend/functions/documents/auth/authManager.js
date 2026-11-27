import { CognitoIdentityProviderClient, GetUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import { UnauthorizedException } from "../util/exception/unauthorizedException.js";

const GROUP_ATTRIBUTE = "custom:group";
const MISSING_TOKEN_MESSAGE = "No authorization token provided.";
const INVALID_TOKEN_MESSAGE = "Invalid or expired authorization token.";

const REFUSED_TOKEN_ERRORS = new Set(["NotAuthorizedException", "UserNotFoundException"]);

const readGroup = (attributes) =>
  (attributes ?? []).find((attribute) => attribute.Name === GROUP_ATTRIBUTE)?.Value ?? null;

export class AuthManager {
  constructor({ cognitoClient = new CognitoIdentityProviderClient({}) } = {}) {
    this.cognitoClient = cognitoClient;
  }

  async getUser(accessToken) {
    if (!accessToken) {
      throw new UnauthorizedException(MISSING_TOKEN_MESSAGE);
    }
    const user = await this.fetchCognitoUser(accessToken);
    if (!user?.Username) {
      throw new UnauthorizedException(INVALID_TOKEN_MESSAGE);
    }
    return { userId: user.Username, role: readGroup(user.UserAttributes) };
  }

  async fetchCognitoUser(accessToken) {
    try {
      return await this.cognitoClient.send(new GetUserCommand({ AccessToken: accessToken }));
    } catch (error) {
      if (REFUSED_TOKEN_ERRORS.has(error?.name)) {
        throw new UnauthorizedException(INVALID_TOKEN_MESSAGE);
      }
      throw error;
    }
  }
}
