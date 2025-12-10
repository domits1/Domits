import { Service } from "../business/service/service.js";
import { AuthManager } from "../auth/authManager.js";
import { ok, err, parseJson } from "../util/http.js";

export class Controller {
  service;
  authManager;

  constructor() {
    this.service = new Service();
    this.authManager = new AuthManager();
  }

  async retrieve(event) {
    try {
      const token =
        event.headers?.Authorization ||
        event.headers?.authorization ||
        event?.multiValueHeaders?.Authorization?.[0] ||
        event?.multiValueHeaders?.authorization?.[0] ||
        event?.params?.header?.Authorization ||
        event?.params?.header?.authorization ||
        event.authorizationToken;

      await this.authManager.userIsAuthorized(token);

      const body = parseJson(event);
      if (!body?.calendarUrl) {
        return err(400, "calendarUrl is required");
      }

      const data = await this.service.retrieveFromExternalCalendar(body.calendarUrl);
      return ok(data);
    } catch (e) {
      console.error(e);
      return err(e.statusCode || 500, e.message || "Internal error");
    }
  }
}