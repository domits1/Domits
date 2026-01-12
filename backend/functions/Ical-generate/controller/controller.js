import { Service } from "../business/service/service.js";
import { AuthManager } from "../auth/authManager.js";
import { okIcs, err, parseJson } from "../util/http.js";

export class Controller {
  service;
  authManager;

  constructor() {
    this.service = new Service();
    this.authManager = new AuthManager();
  }

  async generate(event) {
    try {
      const token =
        event.headers?.Authorization ||
        event.headers?.authorization ||
        event?.multiValueHeaders?.Authorization?.[0] ||
        event?.multiValueHeaders?.authorization?.[0] ||
        event?.params?.header?.Authorization ||
        event?.params?.header?.authorization ||
        event.authorizationToken;

      if (token) {
        await this.authManager.userIsAuthorized(token);
      }

      const body = parseJson(event) || {};
      const events = body.events || [];
      const calendarName = body.calendarName || "Domits";
      const filename = body.filename || "domits.ics";

      const icsText = await this.service.generateCalendarIcs({
        events,
        calendarName,
      });

      return okIcs(icsText, filename);
    } catch (e) {
      console.error(e);
      return err(e.statusCode || 500, e.message || "Internal error");
    }
  }
}