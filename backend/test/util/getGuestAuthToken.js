import {
    CognitoIdentityProviderClient,
    AdminInitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";

// The hardcoded credentials below are for testing purposes only.
export async function getGuestAuthToken() {
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
        return response.AuthenticationResult?.AccessToken;
    } catch (error) {
        console.error("Unable to get a auth token,", error);
        throw new Error("Unable to get a auth token.");
    }
}
