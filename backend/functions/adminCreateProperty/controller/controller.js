import { AuthManager } from "../auth/authManager.js";
import { Repository } from "../data/repository.js";
import responseHeaders from "../utils/constant/responseHeader.json" with { type: "json" };

export class Controller {
  authManager;
  repository;

  constructor() {
    this.authManager = new AuthManager();
    this.repository = new Repository();
  }

  async createProperty(event) {
    try {
      const token = event.headers?.Authorization || event.headers?.authorization || "";
      const hostId = await this.authManager.authorizeGroupRequest(token, "Host");
      const raw = event.body || "{}";
      const body = typeof raw === "string" ? JSON.parse(raw) : raw;
      const created = await this.repository.createFullProperty(body, hostId);
      return {
        statusCode: 200,
        headers: responseHeaders,
        body: JSON.stringify({
          success: true,
          message: "Property successfully created",
          propertyId: created.id,
          registrationnumber: created.registrationnumber
        })
      };
    } catch (error) {
      return {
        statusCode: error.statusCode || 500,
        headers: responseHeaders,
        body: JSON.stringify({ error: error.message || "Internal error" })
      };
    }
  }
}