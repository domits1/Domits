import { Repository } from "../../data/repository.js";
import AuthManager from "../../auth/authManager.js";
export class Service {
  constructor() {
    this.repository = new Repository();
    this.authManager = new AuthManager();
  }

  async getKpiMetric(event, kpiMetric) {
    const token = event.headers.Authorization;
    if (!token) throw new Error("Authorization token is missing");

    const { sub: cognitoUserId } = await this.authManager.authenticateUser(token);
    if (!cognitoUserId) throw new Error("User ID is missing");

    switch (kpiMetric) {
      case "revenue":
        return await this.repository.getTotalRevenue(cognitoUserId);
      case "bookedNights":
        return await this.repository.getBookedNights(cognitoUserId);
      case "availableNights":
        return await this.repository.getAvailableNights(cognitoUserId);
      case "propertyCount":
        return await this.repository.getProperties(cognitoUserId);
      default:
        throw new Error(`Unknown metric: ${kpiMetric}`);
    }
  }
}
