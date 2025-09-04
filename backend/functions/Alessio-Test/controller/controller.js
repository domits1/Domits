import { Service } from "../business/service/service.js";
import { AuthManager } from "../auth/authManager.js";
import responseHeaders from "../util/constant/responseHeader.json" with { type: "json" };

export class Controller {
    service;
    authManager;

    constructor() {
        this.service = new Service();
        this.authManager = new AuthManager();
    }

    async getUser(event) {
        try {
            return {
                statusCode: 200,
                body: JSON.stringify(await this.service.getUser()),
                headers: responseHeaders
            };
        } catch (error) {
            console.error(error.message);
            return {
                statusCode: error.statusCode || 500,
                body: JSON.stringify(
                    error.message || "Something went wrong, please contact support."
                )
            };
        }
    }

    async helloWorld(event) {
        try {
            return {
                statusCode: 200,
                body: JSON.stringify("Hello World"),
                headers: responseHeaders
            };
        } catch (error) {
            console.error(error.message);
            return {
                statusCode: error.statusCode || 500,
                body: JSON.stringify(
                    error.message || "Something went wrong, please contact support."
                )
            };
        }
    }
}
