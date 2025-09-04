// index.js (or handler.js)
import { Controller } from "./controller/controller.js";
import Database from "database";

let controller = null;
let pool = null;

export const handler = async (event) => {
    try {
        if (!controller) {
            controller = new Controller();
        }
        if (!pool) {
            pool = await Database.getInstance();
        }

        switch (event.httpMethod) {
            case "GET":
                if (event.path === "/hello") {
                    return controller.helloWorld(event);
                } else if (event.path === "/user") {
                    return controller.getUser(event);
                } else {
                    return {
                        statusCode: 404,
                        body: JSON.stringify("Resource not found.")
                    };
                }
            default:
                return {
                    statusCode: 404,
                    body: JSON.stringify("HTTP method not found.")
                };
        }
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify("Something went wrong, please contact support.")
        };
    }
};

