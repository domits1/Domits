import { NotFoundException } from "../../util/exception/NotFoundException.js";
import { CognitoIdentityProviderClient, AdminGetUserCommand, GetUserCommand } from "@aws-sdk/client-cognito-identity-provider";

export class CognitoRepository {

    constructor(systemManager) {
        this.systemManager = systemManager
    }
    cognitoClient = new CognitoIdentityProviderClient({region: "eu-north-1"})

    async getUserByAccessToken(accessToken) {
        const params = new GetUserCommand({
            "AccessToken": accessToken
        })
        const result = await this.cognitoClient.send(params)
        return result.Username ? result : NotFoundException("User not found.");
    }

    async getUserById(id) {
        const params = new AdminGetUserCommand({
            UserPoolId: "eu-north-1_mPxNhvSFX",
            Username: id
        });
        const result = await this.cognitoClient.send(params);
        return result.Username ? result : NotFoundException("User not found.");
    }
}