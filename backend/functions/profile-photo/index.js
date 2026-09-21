import { Controller } from "./controller/controller.js";

const ORIGIN_HEADER = { "Access-Control-Allow-Origin": "*" };
const CORS_HEADERS = {
    ...ORIGIN_HEADER,
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

const jsonResponse = (statusCode, body) => ({
    statusCode,
    headers: ORIGIN_HEADER,
    body: JSON.stringify(body),
});

let controller;

export const handler = async (event) => {
    controller ??= new Controller();

    try {
        if (event.httpMethod === "OPTIONS") {
            return { statusCode: 200, headers: CORS_HEADERS };
        }
        if (event.httpMethod === "POST") {
            return await controller.uploadPhoto(event);
        }
        return jsonResponse(404, { message: `Method ${event.httpMethod} not supported.` });
    } catch (error) {
        return jsonResponse(500, { message: "Internal Server Error", error: error.message });
    }
};
