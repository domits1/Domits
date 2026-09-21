import { CognitoIdentityProviderClient, GetUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import UnauthorizedException from "../util/exception/unauthorizedException.js";

const cognitoClient = new CognitoIdentityProviderClient({ region: "eu-north-1" });

const normalizeAccessToken = (accessToken) => {
  if (!accessToken) return null;
  return String(accessToken).replace(/^Bearer\s+/i, "").trim();
};

class AuthManager {
  async authenticate(accessToken) {
    const normalizedToken = normalizeAccessToken(accessToken);

    if (!normalizedToken) {
      throw new UnauthorizedException("No authorization token provided.");
    }

    try {
      const result = await cognitoClient.send(new GetUserCommand({ AccessToken: normalizedToken }));
      const attributes = Object.fromEntries(result.UserAttributes.map((attr) => [attr.Name, attr.Value]));

      return {
        username: result.Username,
        sub: attributes.sub || result.Username,
        role: attributes["custom:group"] || null,
        email: attributes.email || null,
        givenName: attributes.given_name || null,
      };
    } catch {
      throw new UnauthorizedException("Invalid or expired authorization token.");
    }
  }
}

export default AuthManager;