import { NotFoundException } from "../util/exception/NotFoundException.js";
import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  GetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";

export class CognitoRepository {
  constructor(systemManager) {
    this.systemManager = systemManager;
  }
  cognitoClient = new CognitoIdentityProviderClient({ region: "eu-north-1" });

  async getUserByAccessToken(accessToken) {
    const params = new GetUserCommand({
      AccessToken: accessToken,
    });
    const result = await this.cognitoClient.send(params);

    if (result.Username) {
      return result;
    } else {
      throw new NotFoundException("User not found.");
    }
  }
}