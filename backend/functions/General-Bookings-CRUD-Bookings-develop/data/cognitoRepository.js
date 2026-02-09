import { CognitoIdentityProviderClient, GetUserCommand} from "@aws-sdk/client-cognito-identity-provider";
import Unauthorized from "../util/exception/Unauthorized.js"

class CognitoRepository{
    constructor() {
        if (process.env.TEST !== "true") {
            this.client = new CognitoIdentityProviderClient({ region: "eu-north-1" });
        } else {
            this.client = null;
        }
    }

    async getUser(auth){
        // TEST mode: Return mock user data without calling AWS Cognito
        if (process.env.TEST === "true") {
            return {
                UserAttributes: [
                    { Name: "sub", Value: "test-user-sub-123" },
                    { Name: "email", Value: "test@example.com" },
                    { Name: "email_verified", Value: "true" },
                ],
                Username: "test-user",
            };
        }

        // PROD mode: Call real AWS Cognito
        if (!this.client) {
            this.client = new CognitoIdentityProviderClient({ region: "eu-north-1" });
        }

        const input = {
            AccessToken: auth,
        };

        try {
            const command = new GetUserCommand(input);
            const response = await this.client.send(command);
            return response;
        } catch (error) {
            console.error(error);
            throw new Unauthorized("Invalid auth token. Try getting a new token.");
        }
    }
}
export default CognitoRepository;