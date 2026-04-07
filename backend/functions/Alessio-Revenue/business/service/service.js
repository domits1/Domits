import { KpiCalculator } from "./kpiCalculator.js";
import { Repository } from "../../data/repository.js";
import AuthManager from "../../auth/authManager.js";
import Stripe from "stripe";
import { PaymentsService } from "./paymentService.js";
import "dotenv/config";

export class Service {
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    this.repository = new Repository();
    this.authManager = new AuthManager();
    this.paymentsService = new PaymentsService();
  }


  async _resolveContext(event) {
    const token = event?.headers?.Authorization;
    if (!token) throw new Error("Authorization token is missing");

    const { sub: cognitoUserId } =
      await this.authManager.authenticateUser(token);
    if (!cognitoUserId) throw new Error("User ID is missing");

    const { filterType, startDate, endDate } =
      event.queryStringParameters || event.body || {};

    const { startDate: start, endDate: end } =
      this.getDateRange(filterType, startDate, endDate);

    return {
      userId: cognitoUserId,
      filterType: filterType ?? null,
      start,
      end,
    };
  }

  async _fetchKpiBaseData(event, userId, start, end) {
    const [
      totalRevenue,
      bookedNights,
      availableNights,
      propertyCount,
      averageLengthOfStay,
    ] = await Promise.all([
      (async () => {
        try {
          const revenue = await this.paymentsService.getTotalHostRevenue(event);

          // If Stripe is not configured or returns no data
          if (!revenue || revenue.totalRevenue === undefined || revenue.totalRevenue === null) {
            return { totalRevenue: null, error: "Stripe not configured" };
          }

          return revenue;
        } catch (err) {
          // Instead of silently returning 0, return clear state
          return { totalRevenue: null, error: "Stripe not configured" };
        }
      })(),
      this.repository.getBookedNights(userId, start, end),
      this.repository.getAvailableNights(userId, start, end),
      this.repository.getProperties(userId, start, end),
      this.repository.getAverageLengthOfStay(userId, start, end),
    ]);

    const revenueValue = totalRevenue?.totalRevenue ?? 0;
    const bookedValue = bookedNights?.bookedNights ?? 0;
    const availableValue = availableNights?.availableNights ?? 0;

    const averageDailyRate =
      KpiCalculator.calculateADR(revenueValue, bookedValue);

    const occupancyRate =
      KpiCalculator.calculateOccupancyRate(bookedValue, availableValue);

    const revenuePerAvailableRoom =
      KpiCalculator.calculateRevPAR(
        revenueValue,
        bookedValue,
        availableValue
      );

    return {
      raw: {
        totalRevenue,
        bookedNights,
        availableNights,
        propertyCount,
        averageLengthOfStay,
      },
      calc: {
        averageDailyRate,
        occupancyRate,
        revenuePerAvailableRoom,
      },
    };
  }

  async getKpiMetric(event, kpiMetric) {
    const { userId, start, end } =
      await this._resolveContext(event);

    const { raw, calc } =
      await this._fetchKpiBaseData(event, userId, start, end);

    switch (kpiMetric) {
      case "revenue":
        return raw.totalRevenue;
      case "bookedNights":
        return raw.bookedNights;
      case "availableNights":
        return raw.availableNights;
      case "propertyCount":
        return raw.propertyCount;
      case "averageDailyRate":
        return calc.averageDailyRate.toFixed(2);
      case "revenuePerAvailableRoom":
        return calc.revenuePerAvailableRoom.toFixed(2);
      case "occupancyRate":
        return calc.occupancyRate.toFixed(2);
      case "averageLengthOfStay":
        return raw.averageLengthOfStay;
      case "ratesApi":
        return this.repository.getBaseRate(userId);
      default:
        throw new Error(`Unknown metric: ${kpiMetric}`);
    }
  }

  // All KPIs in one call

  async getAllKpis(event) {
    const { userId, filterType, start, end } =
      await this._resolveContext(event);

    const { raw, calc } =
      await this._fetchKpiBaseData(event, userId, start, end);

    const snapshotPayload = {
      revenue: Number(raw.totalRevenue?.totalRevenue ?? 0),
      bookedNights: Number(raw.bookedNights?.bookedNights ?? 0),
      availableNights: Number(raw.availableNights?.availableNights ?? 0),
      propertyCount: Number(raw.propertyCount?.propertyCount ?? 0),
      alos: Number(raw.averageLengthOfStay?.averageLengthOfStay ?? 0),
      adr: Number(calc.averageDailyRate ?? 0),
      occupancyRate: Number(calc.occupancyRate ?? 0),
      revpar: Number(calc.revenuePerAvailableRoom ?? 0),
      };

    try {
      await this.repository.createKpiSnapshot({
      userId,
      hostId: userId, // voorlopig hetzelfde
      periodType: filterType ?? "alltime",
      periodStart: start,
      periodEnd: end,
      metrics: snapshotPayload,
      });
    } catch {
      // Snapshot persistence must not block the KPI response.
    }

    return {
      revenue: raw.totalRevenue,
      bookedNights: raw.bookedNights,
      availableNights: raw.availableNights,
      propertyCount: raw.propertyCount,
      averageLengthOfStay: raw.averageLengthOfStay,
      averageDailyRate: calc.averageDailyRate.toFixed(2),
      occupancyRate: calc.occupancyRate.toFixed(2),
      revenuePerAvailableRoom:
        calc.revenuePerAvailableRoom.toFixed(2),
    };
  }

  getDateRange(filterType, startDate, endDate) {
    if (!filterType)
      return { startDate: null, endDate: null };

    const now = new Date();
    let start, end;

    switch (filterType) {
      case "weekly": {
      const day = now.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;

      start = new Date(now);
      start.setDate(now.getDate() + diffToMonday);
      start.setHours(0, 0, 0, 0);

     end = new Date(start);
     end.setDate(start.getDate() + 6);
     end.setHours(23, 59, 59, 999);
      break;
      } 

    case "monthly": {
     start = new Date(now.getFullYear(), now.getMonth(), 1);

      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
    }

    case "custom": {
     if (!startDate || !endDate) {
      throw new Error("Custom filter requires startDate and endDate");
    }

      const parseDate = (str) => {
      const [day, month, year] = str.split("-").map(Number);
       if (!day || !month || !year) {
        throw new Error(`Invalid date format: ${str}`);
      }
      return new Date(year, month - 1, day);
    };

      start = parseDate(startDate);
      end = parseDate(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new Error("Invalid date(s) provided");
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    break;
    }

     default:
      throw new Error(`Invalid filter type: ${filterType}`);
    }

    return { startDate: start, endDate: end };
  }
}