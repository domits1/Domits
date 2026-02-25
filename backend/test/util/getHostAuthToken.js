import {
  CognitoIdentityProviderClient,
  AdminInitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";

let cachedHostToken = null;
let hostTokenExpiresAt = 0;
let hostTokenRequest = null;

// The hardcoded credentials below are for testing purposes only.
export async function getHostAuthToken() {
  const now = Date.now();
  if (cachedHostToken && now < hostTokenExpiresAt) {
    return cachedHostToken;
  }

  if (hostTokenRequest) {
    return hostTokenRequest;
  }

  hostTokenRequest = (async () => {
    try {
      const client = new CognitoIdentityProviderClient({ region: "eu-north-1" });
      const command = new AdminInitiateAuthCommand({
        UserPoolId: "eu-north-1_mPxNhvSFX",
        ClientId: "3mbk6j5phshnmnc8nljued41qt",
        AuthFlow: "ADMIN_NO_SRP_AUTH",
        AuthParameters: {
          USERNAME: "xasici5246@cigidea.com",
          PASSWORD: "Test.123",
        },
      });

      const response = await client.send(command);
      const accessToken = response.AuthenticationResult?.AccessToken;
      const expiresInSeconds = Number(response.AuthenticationResult?.ExpiresIn || 3600);
      cachedHostToken = accessToken || null;
      hostTokenExpiresAt = Date.now() + Math.max(60, expiresInSeconds - 60) * 1000;
      return cachedHostToken;
    } catch (error) {
      console.error("Unable to get a auth token,", error);
      throw new Error("Unable to get a auth token.");
    } finally {
      hostTokenRequest = null;
    }
  })();

  return hostTokenRequest;
}