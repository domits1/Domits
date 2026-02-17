import {
    CognitoIdentityProviderClient,
    AdminInitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { isTestMode } from "../../util/isTestMode.js";

// Deterministic test tokens
export const TEST_HOST_TOKEN = "dummy-host-token";
export const TEST_GUEST_TOKEN = "dummy-guest-token";

/**
 * Get a deterministic auth token for testing purposes.
 * In TEST mode, returns a dummy token based on the user type.
 * @param {string} userType - Either "host" or "guest"
 * @returns {string} The auth token
 */
export function getTestAuthToken(userType) {
    if (userType === "host") {
        return TEST_HOST_TOKEN;
    }
    return TEST_GUEST_TOKEN;
}

/**
 * Get the host auth token - used for testing.
 * @returns {Promise<string>} The host auth token
 */
export async function getHostAuthToken() {
    // In test mode, avoid real AWS calls and return a dummy token.
    if (isTestMode()) {
        return TEST_HOST_TOKEN;
    }

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
        return response.AuthenticationResult?.AccessToken;
    } catch (error) {
        console.error("Unable to get a auth token,", error);
        throw new Error("Unable to get a auth token.");
    }
}

/**
 * Get the guest auth token - used for testing.
 * @returns {Promise<string>} The guest auth token
 */
export async function getGuestAuthToken() {
    // In test mode, avoid real AWS calls and return a dummy token.
    if (isTestMode()) {
        return TEST_GUEST_TOKEN;
    }

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
