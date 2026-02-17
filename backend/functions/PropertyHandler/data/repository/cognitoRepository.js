import { NotFoundException } from "../../util/exception/NotFoundException.js";
import { CognitoIdentityProviderClient, AdminGetUserCommand, GetUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import { isTestMode } from "../../../../util/isTestMode.js";

// Deterministic test user IDs
const TEST_HOST_ID = "test-host-id-12345";
const TEST_GUEST_ID = "test-guest-id-67890";

export class CognitoRepository {

    constructor(systemManager) {
        this.systemManager = systemManager
    }
    cognitoClient = new CognitoIdentityProviderClient({region: "eu-north-1"})

    async getUserByAccessToken(accessToken) {
        // In TEST mode, return mocked Cognito response based on token
        if (isTestMode()) {
            if (accessToken === "dummy-host-token") {
                return {
                    Username: TEST_HOST_ID,
                    UserAttributes: [
                        { Name: "sub", Value: TEST_HOST_ID },
                        { Name: "custom:group", Value: "Host" },
                        { Name: "given_name", Value: "Test" },
                        { Name: "family_name", Value: "Host" }
                    ]
                };
            } else if (accessToken === "dummy-guest-token") {
                return {
                    Username: TEST_GUEST_ID,
                    UserAttributes: [
                        { Name: "sub", Value: TEST_GUEST_ID },
                        { Name: "custom:group", Value: "Guest" },
                        { Name: "given_name", Value: "Test" },
                        { Name: "family_name", Value: "Guest" }
                    ]
                };
            }
            // For unknown tokens in test mode, return a guest user
            return {
                Username: TEST_GUEST_ID,
                UserAttributes: [
                    { Name: "sub", Value: TEST_GUEST_ID },
                    { Name: "custom:group", Value: "Guest" },
                    { Name: "given_name", Value: "Test" },
                    { Name: "family_name", Value: "Guest" }
                ]
            };
        }

        const params = new GetUserCommand({
            "AccessToken": accessToken
        })
        const result = await this.cognitoClient.send(params)
        return result.Username ? result : NotFoundException("User not found.");
    }

    async getUserById(id) {
        // In TEST mode, return mocked user data
        if (isTestMode()) {
            if (id === TEST_HOST_ID) {
                return {
                    Username: TEST_HOST_ID,
                    UserAttributes: [
                        { Name: "sub", Value: TEST_HOST_ID },
                        { Name: "custom:group", Value: "Host" },
                        { Name: "given_name", Value: "Test" },
                        { Name: "family_name", Value: "Host" }
                    ]
                };
            }
            // Default to guest for any other ID in test mode
            return {
                Username: TEST_GUEST_ID,
                UserAttributes: [
                    { Name: "sub", Value: TEST_GUEST_ID },
                    { Name: "custom:group", Value: "Guest" },
                    { Name: "given_name", Value: "Test" },
                    { Name: "family_name", Value: "Guest" }
                ]
            };
        }

        const params = new AdminGetUserCommand({
            UserPoolId: "eu-north-1_mPxNhvSFX",
            Username: id
        });
        const result = await this.cognitoClient.send(params);
        return result.Username ? result : NotFoundException("User not found.");
    }

}
