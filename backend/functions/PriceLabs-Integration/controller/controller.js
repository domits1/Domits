import { PriceLabsService } from "../business/service/priceLabsService.js";
import { CognitoRepository } from "../data/cognitoRepository.js";

const HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,PATCH,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Content-Type": "application/json",
};

export class Controller {
  constructor() {
    this.service  = new PriceLabsService();
    this.cognito  = new CognitoRepository();
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
