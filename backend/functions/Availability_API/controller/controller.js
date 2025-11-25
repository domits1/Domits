import { Service } from "../business/service/service.js";

import responseHeaders from "../util/constant/responseHeader.json" with { type: "json" };

export class Controller {
    service;
    authManager;

    constructor() {
        this.service = new Service();
    }

    async getProperty(event) {
        try {
            if (typeof id === 'string') {
                id = JSON.parse(id);
            }

            const propertyId = event.queryStringParameters.propertyId;

            const result = await this.service.getPropertyById(propertyId);

            return {
                statusCode: 200,
                body: JSON.stringify(result),
                headers: responseHeaders
            };

        } catch (error) {
            console.error(error.message);
            return {
                statusCode: error.statusCode || 500,
                body: JSON.stringify(error.message || "Something went wrong, please contact support.")
            };
        }
    }
}