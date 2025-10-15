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
    console.log("🟡 Controller.createProperty START");

    try {
      const token = event.headers?.Authorization || event.headers?.authorization || "";
      console.log("Token received:", token ? "✅ Yes" : "❌ No");

      const hostId = await this.authManager.authorizeGroupRequest(token, "Host");
      console.log("Authorized hostId:", hostId);

      const raw = event.body || "{}";
      const body = typeof raw === "string" ? JSON.parse(raw) : raw;
      console.log("Parsed body:", body);

            const created = await this.repository.createProperty(body, hostId);
            console.log("✅ Property created successfully:", created);

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
      console.error("❌ Controller.createProperty ERROR:", error);
      return {
        statusCode: 500,
        headers: responseHeaders,
        body: JSON.stringify({ error: error.message, stack: error.stack })
      };
    }
  }
}