import { PropertyController } from "./controller/propertyController.js";

let controller = null;

export const handler = async (event) => {
    try {
        if (!controller) {
            controller = new PropertyController();
        }

        return await (async () => {
            switch (event.httpMethod) {
                case "GET":
                    return controller.get(event);
                default:
                    return {
                        statusCode: 404,
                        body: "HTTP method not found."
                    }
            }
        })();
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: "Something went wrong, please contact support."
        }
    }
}