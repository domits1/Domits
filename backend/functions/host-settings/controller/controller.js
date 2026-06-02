import { Service } from "../business/service/service.js";
import { AuthManager } from "../auth/authManager.js";
import responseHeaders from "../util/constant/responseHeader.json" with { type: "json" };

export class Controller {
    constructor() {
        this.service = new Service();
        this.authManager = new AuthManager();
    }

    async getSettings(event) {
        try {
            const hostId = await this.authManager.getHostId(event.headers?.Authorization);
            const settings = await this.service.getSettings(hostId);
            return { statusCode: 200, headers: responseHeaders, body: JSON.stringify(settings) };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async updateSettings(event) {
        try {
            const hostId = await this.authManager.getHostId(event.headers?.Authorization);
            const data = JSON.parse(event.body);
            const result = await this.service.updateSettings(hostId, data);
            return { statusCode: 200, headers: responseHeaders, body: JSON.stringify(result) };
        } catch (error) {
            return this.handleError(error);
        }
    }

    handleError(error) {
        return {
            statusCode: error.statusCode || 500,
            headers: responseHeaders,
            body: JSON.stringify({ message: error.message || "Something went wrong, please contact support." })
        };
    }
}