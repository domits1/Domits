import { CognitoIdentityProviderClient, GetUserCommand} from "@aws-sdk/client-cognito-identity-provider";
import Unauthorized from "../util/exception/Unauthorized.mjs"
const client = new CognitoIdentityProviderClient({ region: "eu-north-1" });

class CognitoRepository{
    async getUser(auth){
        const input = {
            AccessToken: auth,
        };

        try {
            const command = new GetUserCommand(input);
            const response = await client.send(command);
            console.log("UserID from CognitoRepository.mjs", response.Username);
            return response;
        } catch (error) {
            throw new Unauthorized("Invalid auth token. Try getting a new token.");
        }
    }

    async authorizeGroupRequest(specifiedGroup, verifyGroup){ // WIP!
        console.log("authorizeGroupRequest, i got the ", specifiedGroup, verifyGroup);
    }

    async verifyUserRequest(){
        
    } 
}
export default CognitoRepository;