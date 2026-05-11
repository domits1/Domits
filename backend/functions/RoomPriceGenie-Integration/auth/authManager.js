import { CognitoRepository } from "../data/cognitoRepository.js";

class AuthManager {
  constructor() {
    this.cognitoRepository = new CognitoRepository();
  }

  async authenticateUser(auth) {
    const response = await this.cognitoRepository.getUserByAccessToken(auth);
    const UserAttributes = {};
    response.UserAttributes.forEach((attr) => {
      UserAttributes[attr.Name] = attr.Value;
    });
    return UserAttributes;
  }
}

export default AuthManager;
