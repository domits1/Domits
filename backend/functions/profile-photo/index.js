import { Controller } from "./controller/controller.js";

let controller = null;

export const handler = async (event) => {

    try {
        if (!controller) {
            controller = new Controller();
        }

        switch (event.httpMethod) {
            case "POST":
                return await controller.uploadPhoto(event);

            case "OPTIONS":
                return {
                    statusCode: 200,
                    headers: {
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "POST,OPTIONS",
                        "Access-Control-Allow-Headers": "Content-Type,Authorization"
                    }
                };

            default:
                return {
                    statusCode: 404,
                    headers: { "Access-Control-Allow-Origin": "*" },
                    body: JSON.stringify({ message: `Method ${event.httpMethod} not supported.` })
                };
        }
    } catch (error) {
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({
                message: "Internal Server Error",
                error: error.message
            })
        };
    }
};
