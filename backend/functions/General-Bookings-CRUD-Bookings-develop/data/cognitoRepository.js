import { CognitoIdentityProviderClient, GetUserCommand} from "@aws-sdk/client-cognito-identity-provider";
import Unauthorized from "../util/exception/Unauthorized.js"
const client = new CognitoIdentityProviderClient({ region: "ap-southeast-2" });

class CognitoRepository{
    async getUser(auth){
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
