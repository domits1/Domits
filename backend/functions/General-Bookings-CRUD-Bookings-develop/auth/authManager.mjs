import CognitoRepository from "../data/cognitoRepository.mjs"

class AuthManager{
    
    constructor(){
        this.cognitorepository = new CognitoRepository();
    }

    async authenticateUser(auth){
        const returnedResponse = await this.cognitorepository.getUser(auth);
        const UserAttributes = {};
        returnedResponse.UserAttributes.forEach(attr => {
          UserAttributes[attr.Name] = attr.Value;
        });
        return UserAttributes;

    }

}

export default AuthManager;