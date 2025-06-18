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

        return await (async () => {
            switch (event.httpMethod) {
                case "GET":
                    return controller.getUser(event)
                default:
                    return {
                        statusCode: 404,
                        body: "HTTP method not found."
                    }
            }
        })();
    } catch (error) {
        return {
            statusCode: 500,
            body: "Something went wrong, please contact support."
        }
    }
}