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

    const userId = cognitoUserId;

    const { filterType, startDate, endDate } = event.queryStringParameters || event.body || {};
    const { startDate: start, endDate: end } = this.getDateRange(filterType, startDate, endDate);

    const totalRevenue = await this.repository.getTotalRevenue(userId, start, end);
    const bookedNights = await this.repository.getBookedNights(userId, start, end);
    const availableNights = await this.repository.getAvailableNights(userId, start, end);
    const propertyCount = await this.repository.getProperties(userId, start, end);
    const averageLengthOfStay = await this.repository.getAverageLengthOfStay(userId, start, end);

    const averageDailyRate = bookedNights.bookedNights > 0 ? totalRevenue.totalRevenue / bookedNights.bookedNights : 0;

    const occupancyRate =
      availableNights.availableNights > 0 ? (bookedNights.bookedNights / availableNights.availableNights) * 100 : 0;

    const revenuePerAvailableRoom = averageDailyRate * (occupancyRate / 100);

    switch (kpiMetric) {
      case "revenue":
        return totalRevenue;
      case "bookedNights":
        return bookedNights;
      case "availableNights":
        return availableNights;
      case "propertyCount":
        return propertyCount;
      case "averageDailyRate":
        return averageDailyRate.toFixed(2);
      case "revenuePerAvailableRoom":
        return revenuePerAvailableRoom.toFixed(2);
      case "occupancyRate":
        return occupancyRate.toFixed(2);
      case "averageLengthOfStay":
        return averageLengthOfStay;
      default:
        throw new Error(`Unknown metric: ${kpiMetric}`);
    }
  }

  getDateRange(filterType, startDate, endDate) {
    if (!filterType) return { startDate: null, endDate: null };

    const now = new Date();
    let start, end;

    switch (filterType) {
      case "weekly":
        const day = now.getDay();
        const diffToMonday = (day === 0 ? -6 : 1) - day;
        start = new Date(now);
        start.setDate(now.getDate() + diffToMonday);
        start.setHours(0, 0, 0, 0);

        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;

      case "monthly":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;

      case "custom":
        if (!startDate || !endDate) {
          throw new Error("Custom filter requires startDate and endDate");
        }

        const parseDate = (str) => {
          const [day, month, year] = str.split("-").map(Number);
          if (!day || !month || !year) throw new Error(`Invalid date format: ${str}`);
          return new Date(year, month - 1, day);
        };

        start = parseDate(startDate);
        end = parseDate(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          throw new Error("Invalid date(s) provided");
        }

        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;

      default:
        throw new Error(`Invalid filter type: ${filterType}`);
    }

    return { startDate: start, endDate: end };
  }
}
