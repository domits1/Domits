import { CognitoRepository } from "../data/cognitoRepository.js";

export default class AuthManager {

  constructor() {
    this.cognitoRepository = new CognitoRepository();
  }

  async authenticateUser(auth) {
    const returnedResponse = await this.cognitoRepository.getUserByAccessToken(auth);
    const UserAttributes = {};
    returnedResponse.UserAttributes.forEach((attr) => {
      UserAttributes[attr.Name] = attr.Value;
    });
    return UserAttributes;
  }
}
