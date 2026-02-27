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
      const user = await this.authManager.userIsAuthorized(token);
      const body = parseJson(event) || {};
      const action = String(body.action || "RETRIEVE_EXTERNAL").trim().toUpperCase();

      if (action === "RETRIEVE_EXTERNAL") {
        if (!body?.calendarUrl) return err(400, "calendarUrl is required");
        const data = await this.service.retrieveFromExternalCalendar(body.calendarUrl);
        return ok(data);
      }

      if (action === "LIST_SOURCES") {
        const propertyId = body?.propertyId ? String(body.propertyId).trim() : "";
        if (!propertyId) return err(400, "propertyId is required");
        await this.authManager.authorizePropertyOwnerForUser(user, propertyId);
        const data = await this.service.listSources(propertyId);
        return ok(data);
      }

      if (action === "UPSERT_SOURCE") {
        const propertyId = body?.propertyId ? String(body.propertyId).trim() : "";
        const calendarUrl = body?.calendarUrl ? String(body.calendarUrl).trim() : "";
        const calendarName = body?.calendarName ? String(body.calendarName).trim() : "";
        const calendarProvider = body?.calendarProvider ? String(body.calendarProvider).trim() : "";
        if (!propertyId) return err(400, "propertyId is required");
        if (!calendarUrl) return err(400, "calendarUrl is required");
        if (!calendarName) return err(400, "calendarName is required");
        await this.authManager.authorizePropertyOwnerForUser(user, propertyId);
        const data = await this.service.upsertSource({
          propertyId,
          calendarUrl,
          calendarName,
          calendarProvider,
        });
        return ok(data);
      }

      if (action === "DELETE_SOURCE") {
        const propertyId = body?.propertyId ? String(body.propertyId).trim() : "";
        const sourceId = body?.sourceId ? String(body.sourceId).trim() : "";
        if (!propertyId) return err(400, "propertyId is required");
        if (!sourceId) return err(400, "sourceId is required");
        await this.authManager.authorizePropertyOwnerForUser(user, propertyId);
        const data = await this.service.deleteSource({ propertyId, sourceId });
        return ok(data);
      }

      if (action === "REFRESH_ALL") {
        const propertyId = body?.propertyId ? String(body.propertyId).trim() : "";
        if (!propertyId) return err(400, "propertyId is required");
        await this.authManager.authorizePropertyOwnerForUser(user, propertyId);
        const data = await this.service.refreshAll(propertyId);
        return ok(data);
      }

      return err(400, "Unknown action");
    } catch (e) {
      return err(e.statusCode || 500, e.message || "Internal error");
    }
  }
}
