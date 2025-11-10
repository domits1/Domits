import { Service } from "../business/service/service.js";
import { AuthManager } from "../auth/authManager.js";
import { ok, err, parseJson } from "../util/http.js";

export class Controller {
  service; authManager;
  constructor() {
    this.service = new Service();
    this.authManager = new AuthManager();
  }

  async generate(event) {
    try {
      const token = event.headers?.Authorization || event.headers?.authorization;
      await this.authManager.userIsAuthorized(token);

      const body = parseJson(event);
      if (!body) return err(400, "Invalid JSON body");

      const url = await this.service.generateFromHostRecords(body);
      return ok({ url });
    } catch (e) {
      console.error(e);
      return err(e.statusCode || 500, e.message || "Internal error");
    }
  }
}