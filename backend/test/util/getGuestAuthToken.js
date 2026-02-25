import {
    CognitoIdentityProviderClient,
    AdminInitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";

let cachedGuestToken = null;
let guestTokenExpiresAt = 0;
let guestTokenRequest = null;

// The hardcoded credentials below are for testing purposes only.
export async function getGuestAuthToken() {
    const now = Date.now();
    if (cachedGuestToken && now < guestTokenExpiresAt) {
        return cachedGuestToken;
    }

    if (guestTokenRequest) {
        return guestTokenRequest;
    }

    guestTokenRequest = (async () => {
        try {
            const client = new CognitoIdentityProviderClient({ region: "eu-north-1" });
            const command = new AdminInitiateAuthCommand({
                UserPoolId: "eu-north-1_mPxNhvSFX",
                ClientId: "3mbk6j5phshnmnc8nljued41qt",
                AuthFlow: "ADMIN_NO_SRP_AUTH",
                AuthParameters: {
                    USERNAME: "hayebab362@cristout.com",
                    PASSWORD: "Test.123",
                },
            });

            const response = await client.send(command);
            const accessToken = response.AuthenticationResult?.AccessToken;
            const expiresInSeconds = Number(response.AuthenticationResult?.ExpiresIn || 3600);
            cachedGuestToken = accessToken || null;
            guestTokenExpiresAt = Date.now() + Math.max(60, expiresInSeconds - 60) * 1000;
            return cachedGuestToken;
        } catch (error) {
            console.error("Unable to get a auth token,", error);
            throw new Error("Unable to get a auth token.");
        } finally {
            guestTokenRequest = null;
        }
    })();

    return guestTokenRequest;
}
