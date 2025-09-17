import {Service} from "../business/service/service.js";
import responseHeaders from "../util/constant/responseHeader.json" with { type: "json" };

export default class Controller {
    service;
    authManager;

    constructor() {
        this.service = new Service();
    }

    async getBookingByHostId(event) {
        try {
            const revenue = await this.service.getRevenue(event)
            return {
                statusCode: 200,
                response: {
                    revenue
                },
                headers: responseHeaders
            };
        } catch (error) {
            console.error(error.message);
            return {
                statusCode: error.statusCode || 500,
                body: JSON.stringify(error.message || "Something went wrong, please contact support.")
            }
        }
    }

}