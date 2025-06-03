import {Controller} from "./controller/controller.js";

let controller = new Controller();

export const handler = async (event) => {
    if (!controller) {
        controller = new Controller();
    }
    try {
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