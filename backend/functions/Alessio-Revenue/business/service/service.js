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

    const test = "0f5cc159-c8b2-48f3-bf75-114a10a1d6b3";

    const test1 = await this.repository.getTotalRevenue(test);

    const test2 = await this.repository.getBookedNights(test);

    const result = test1.totalRevenue / test2.bookedNights; // ADR

    const test3 = await this.repository.getAvailableNights(test);

    const result1 = (test2.bookedNights / test3.availableNights) * 100; // Occupancy Rate

    const result2 = result * result1; // RevPAR

    switch (kpiMetric) {
      case "revenue":
        return await this.repository.getTotalRevenue(test);
      case "bookedNights":
        return await this.repository.getBookedNights(test);
      case "availableNights":
        return await this.repository.getAvailableNights(test);
      case "propertyCount":
        return await this.repository.getProperties(test);
      case "averageDailyRate":
        return result.toFixed(2);
      case "revenuePerAvailableRoom":
        console.log(`${result} is ${result1}`);
        return result2.toFixed(2);
      case "occupancyRate":
        return result1.toFixed(2);
      default:
        throw new Error(`Unknown metric: ${kpiMetric}`);
    }
  }
}
