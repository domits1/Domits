import { Service } from "../business/service/service.js";
import { AuthManager } from "../auth/authManager.js";
import { okJson, okIcs, err, parseJson } from "../util/http.js";

const getAuthToken = (event) =>
  event?.headers?.authorization ||
  event?.headers?.Authorization ||
  event?.multiValueHeaders?.authorization?.[0] ||
  event?.multiValueHeaders?.Authorization?.[0] ||
  event?.authorizationToken ||
  null;

export class Controller {
  constructor() {
    this.service = new Service();
    this.authManager = new AuthManager();
  }

  async generate(event) {
    try {
      const token = getAuthToken(event);
      if (token) await this.authManager.userIsAuthorized(token);

      const body = parseJson(event) || {};
      const events = body.events || [];
      const calendarName = body.calendarName || "Domits";
      const filename = body.filename || "domits.ics";
      const ownerId = body.ownerId || "public";
      const returnUrl = body.returnUrl !== false;

      if (returnUrl) {
        const { url } = await this.service.generateCalendarLink({
          events,
          calendarName,
          ownerId,
          filename,
        });
        return okJson({ url });
      }

      const icsText = await this.service.generateCalendarIcs({ events, calendarName });
      return okIcs(icsText, filename);
    } catch (e) {
      return err(e.statusCode || 500, e.message || "Internal error");
    }
  }
}