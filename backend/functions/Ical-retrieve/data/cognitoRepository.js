import {
  CognitoIdentityProviderClient,
  GetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";

export class CognitoRepository {
  constructor() {
    this.cognitoClient = new CognitoIdentityProviderClient({ region: "eu-north-1" });
  }

  async getUserByAccessToken(accessToken) {
    const params = new GetUserCommand({
      AccessToken: accessToken,
    });
    return await this.cognitoClient.send(params);
  }
}
