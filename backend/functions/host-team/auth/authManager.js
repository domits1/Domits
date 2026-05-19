import { UnauthorizedException } from "../util/exception/unauthorizedException.js";
import { CognitoIdentityProviderClient, GetUserCommand } from "@aws-sdk/client-cognito-identity-provider";

const cognitoClient = new CognitoIdentityProviderClient({ region: "eu-north-1" });

export class AuthManager {

    async getUser(accessToken) {
        if (!accessToken) {
            throw new UnauthorizedException("No authorization token provided.");
        }
        try {
            const result = await cognitoClient.send(new GetUserCommand({ AccessToken: accessToken }));
            const attrs = Object.fromEntries(result.UserAttributes.map(a => [a.Name, a.Value]));
            return {
                userId: result.Username,
                email: attrs.email || null,
                role: attrs["custom:group"] || null,
            };
        } catch {
            throw new UnauthorizedException("Invalid or expired authorization token.");
        }
    }
}
