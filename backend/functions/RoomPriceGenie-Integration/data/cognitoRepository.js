import { NotFoundException } from "../util/exception/NotFoundException.js";
import {
  CognitoIdentityProviderClient,
  GetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";

export class CognitoRepository {
  cognitoClient = new CognitoIdentityProviderClient({ region: "eu-north-1" });

  async getUserByAccessToken(accessToken) {
    const result = await this.cognitoClient.send(
      new GetUserCommand({ AccessToken: accessToken })
    );
    if (result.Username) return result;
    throw new NotFoundException("User not found.");
  }
}
