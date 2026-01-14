import { Service } from "../business/service/service.js";
import { AuthManager } from "../auth/authManager.js";
import { ok, err, parseJson } from "../util/http.js";

const getAuthToken = (event) => {
  return (
    event?.headers?.authorization ||
    event?.headers?.Authorization ||
    event?.multiValueHeaders?.authorization?.[0] ||
    event?.multiValueHeaders?.Authorization?.[0] ||
    event?.authorizationToken ||
    null
  );
};

export class Controller {
  constructor() {
    this.service = new Service();
    this.authManager = new AuthManager();
  }

  async retrieve(event) {
    try {
      const token = getAuthToken(event);
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