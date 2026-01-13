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

        return await controller.getProperty(event);

    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: "Something went wrong, please contact support."
        };
    }
};
