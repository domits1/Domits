
import { CognitoIdentityProviderClient, GetUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import { UnauthorizedException } from "../util/exception/unauthorizedException.js";

const cognitoClient = new CognitoIdentityProviderClient({ region: "eu-north-1" });

const normalizeAccessToken = (accessToken) => {
    if (!accessToken) return null;
    return String(accessToken).replace(/^Bearer\s+/i, "").trim();
};

export class AuthManager {
    // Verifies the access token with Cognito and extracts the user's identity.
    // Rejects missing or invalid tokens with an unauthorized exception.
    async getUser(accessToken) {
        const normalizedToken = normalizeAccessToken(accessToken);

        if (!normalizedToken) {
            throw new UnauthorizedException("No authorization token provided.");
        }

        try {
            const result = await cognitoClient.send(new GetUserCommand({ AccessToken: normalizedToken }));
            const attributes = Object.fromEntries(
                result.UserAttributes.map((attr) => [attr.Name, attr.Value])
            );

            return {
                userId: attributes.sub || result.Username,
                username: result.Username,
                email: attributes.email || null,
                role: attributes["custom:group"] || null,
                givenName: attributes.given_name || null,
            };
        } catch {
            throw new UnauthorizedException("Invalid or expired authorization token.");
        }
    }
}