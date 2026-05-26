import { CognitoIdentityProviderClient, GetUserCommand } from "@aws-sdk/client-cognito-identity-provider";

const cognitoClient = new CognitoIdentityProviderClient({ region: "eu-north-1" });

export class CognitoRepository {
  async getHostId(event) {
    const claims =
      event?.requestContext?.authorizer?.claims ||
      event?.requestContext?.authorizer?.jwt?.claims;

    if (claims?.sub) return claims.sub;

    const authHeader = event?.headers?.Authorization || event?.headers?.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw Object.assign(new Error("Unauthorized — missing token"), { status: 401 });
    }
    const accessToken = authHeader.slice(7);
    try {
      const result = await cognitoClient.send(new GetUserCommand({ AccessToken: accessToken }));
      return result.Username;
    } catch {
      throw Object.assign(new Error("Unauthorized — invalid or expired token"), { status: 401 });
    }
  }
}
