import { PriceLabsService } from "../business/service/priceLabsService.js";
import { MissedRevenueService } from "../business/service/missedRevenueService.js";
import { CognitoRepository } from "../data/cognitoRepository.js";
import { Repository } from "../data/repository.js";
import { validateDateRange } from "../util/dateRange.js";

export { validateDateRange };

const HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,PATCH,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Content-Type": "application/json",
};

function defaultMonthRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

export class Controller {
  constructor() {
    this.service  = new PriceLabsService();
    this.cognito  = new CognitoRepository();
    this.missedRevenueService = new MissedRevenueService({ repository: new Repository() });
  }

  async connect(event) {
    return this._run(async () => {
      const hostId = await this.cognito.getHostId(event);
      const { pricelabs_email } = JSON.parse(event.body || "{}");

      if (!pricelabs_email) throw Object.assign(new Error("pricelabs_email is required"), { status: 400 });

      const emailParts = pricelabs_email.split("@");
      if (emailParts.length !== 2 || !emailParts[0] || !emailParts[1]?.includes(".")) {
        throw Object.assign(new Error("pricelabs_email must be a valid email address"), { status: 400 });
      }

      return this.service.connect(hostId, pricelabs_email);
    });
  }

  async disconnect(event) {
    return this._run(async () => {
      const hostId = await this.cognito.getHostId(event);
      return this.service.disconnect(hostId);
    });
  }

  async getStatus(event) {
    return this._run(async () => {
      const hostId = await this.cognito.getHostId(event);
      return this.service.getStatus(hostId);
    });
  }

  async getMissedRevenue(event) {
    return this._run(async () => {
      const hostId = await this.cognito.getHostId(event);
      const qs = event.queryStringParameters || {};
      const { startDate, endDate } = qs.startDate && qs.endDate ? qs : defaultMonthRange();
      validateDateRange(startDate, endDate);

      return this.missedRevenueService.getMissedRevenue(hostId, startDate, endDate);
    });
  }

  async pushListings(event) {
    return this._run(async () => {
      const hostId = await this.cognito.getHostId(event);
      return this.service.pushListings(hostId);
    });
  }

  async pushCalendar(event) {
    return this._run(async () => {
      const hostId = await this.cognito.getHostId(event);
      const { listing_ids } = JSON.parse(event.body || "{}");
      return this.service.pushCalendar(hostId, listing_ids);
    });
  }

  async pushReservations(event) {
    return this._run(async () => {
      const hostId = await this.cognito.getHostId(event);
      return this.service.pushReservations(hostId);
    });
  }

  async internalSyncBooking(event) {
    return this._run(async () => {
      const { hostId, trigger } = JSON.parse(event.body || "{}");
      if (!hostId) throw Object.assign(new Error("hostId is required"), { status: 400 });
      return this.service.syncForBookingChange(hostId, trigger);
    });
  }

  async webhookSync(event) {
    return this._run(async () => {
      return this.service.handleSyncWebhook(event.headers, event.body);
    });
  }

  async webhookCalendarTrigger(event) {
    return this._run(async () => {
      return this.service.handleCalendarTriggerWebhook(event.headers, event.body);
    });
  }

  async webhookHook(event) {
    return this._run(async () => {
      return this.service.handleHookWebhook(event.headers, event.body);
    });
  }

  async _run(fn) {
    try {
      const result = await fn();
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify(result) };
    } catch (err) {
      const status  = err.status  || 500;
      const message = err.message || "Internal Server Error";
      console.error("[PriceLabs]", status, message, err.stack || "");
      return { statusCode: status, headers: HEADERS, body: JSON.stringify({ message }) };
    }
  }
}
