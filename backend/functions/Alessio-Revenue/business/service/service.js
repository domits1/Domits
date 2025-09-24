import { Repository } from "../../data/repository.js";
import AuthManager from "../../auth/authManager.js";

export class Service {
  constructor() {
    this.repository = new Repository();
    this.authManager = new AuthManager();
  }

  async getRevenue(event) {
    const token = event.headers.Authorization;
    if (!token) {
      throw new Error("Authorization token is missing");
    }

    const { sub: cognitoUserId } = await this.authManager.authenticateUser(token);

    return await this.repository.getRevenue(cognitoUserId);
  }
}
