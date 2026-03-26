import { NotFoundException } from "../../util/exception/NotFoundException.js";
import { CognitoIdentityProviderClient, AdminGetUserCommand, GetUserCommand } from "@aws-sdk/client-cognito-identity-provider";

const TEST_USERS_BY_TOKEN = {
    TEST_HOST_TOKEN: {
        Username: "test-host-user",
        UserAttributes: [
            { Name: "custom:group", Value: "Host" },
            { Name: "given_name", Value: "Test" },
            { Name: "family_name", Value: "Host" },
            { Name: "email", Value: "host@test.domits" }
        ]
    },
    TEST_GUEST_TOKEN: {
        Username: "test-guest-user",
        UserAttributes: [
            { Name: "custom:group", Value: "Guest" },
            { Name: "given_name", Value: "Test" },
            { Name: "family_name", Value: "Guest" },
            { Name: "email", Value: "guest@test.domits" }
        ]
    }
};

const TEST_USERS_BY_ID = Object.values(TEST_USERS_BY_TOKEN).reduce((usersById, user) => {
    usersById[user.Username] = user;
    return usersById;
}, {});

export class CognitoRepository {

    constructor(systemManager) {
        this.systemManager = systemManager
    }
    cognitoClient = new CognitoIdentityProviderClient({region: "eu-north-1"})

    async getUserByAccessToken(accessToken) {
        if (process.env.TEST === "true" && TEST_USERS_BY_TOKEN[accessToken]) {
            return TEST_USERS_BY_TOKEN[accessToken];
        }

        const params = new GetUserCommand({
            "AccessToken": accessToken
        })
        const result = await this.cognitoClient.send(params)
        return result.Username ? result : NotFoundException("User not found.");
    }

    async getUserById(id) {
        if (process.env.TEST === "true" && TEST_USERS_BY_ID[id]) {
            return TEST_USERS_BY_ID[id];
        }

        const params = new AdminGetUserCommand({
            UserPoolId: "eu-north-1_mPxNhvSFX",
            Username: id
        });
        const result = await this.cognitoClient.send(params);
        return result.Username ? result : NotFoundException("User not found.");
    }

}
