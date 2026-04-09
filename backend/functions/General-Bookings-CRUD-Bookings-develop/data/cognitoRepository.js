import { CognitoIdentityProviderClient, GetUserCommand} from "@aws-sdk/client-cognito-identity-provider";
import Unauthorized from "../util/exception/Unauthorized.js"
const client = new CognitoIdentityProviderClient({ region: "eu-north-1" });

const TEST_USERS_BY_TOKEN = {
    TEST_HOST_TOKEN: {
        UserAttributes: [
            { Name: "sub", Value: "test-host-user" },
            { Name: "email", Value: "host@test.domits" },
            { Name: "custom:group", Value: "Host" }
        ]
    },
    TEST_GUEST_TOKEN: {
        UserAttributes: [
            { Name: "sub", Value: "test-guest-user" },
            { Name: "email", Value: "guest@test.domits" },
            { Name: "custom:group", Value: "Guest" }
        ]
    }
};

class CognitoRepository{
    async getUser(auth){
        if (process.env.TEST === "true" && TEST_USERS_BY_TOKEN[auth]) {
            return TEST_USERS_BY_TOKEN[auth];
        }

        const input = {
            AccessToken: auth,
        };

        try {
            const command = new GetUserCommand(input);
            const response = await client.send(command);
            return response;
        } catch (error) {
            console.error(error);
            throw new Unauthorized("Invalid auth token. Try getting a new token.");
        }
    }
}
export default CognitoRepository;
