import { Controller } from "./controller/controller.js";
import responseHeaders from "./util/constant/responseHeader.json" with { type: "json" };

let controller = null;

export const handler = async (event) => {
    try {
        if (!controller) {
            controller = new Controller();
        }

        if (event.httpMethod === "OPTIONS") {
            return { statusCode: 200, headers: responseHeaders };
        }

        if (event.httpMethod === "POST") {
            return await controller.createReview(event);
        }

        return {
            statusCode: 405,
            headers: responseHeaders,
            body: JSON.stringify({ message: `Method ${event.httpMethod} not supported.` }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: responseHeaders,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};