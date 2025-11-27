import { DynamicPriceController } from "./controller/dynamicPriceController.js";

let controller = new DynamicPriceController();

export const handler = async (event) => {
    if (!controller) {
        controller = new DynamicPriceController();
    }
    try {
        return await (async () => {
            switch (event.httpMethod) {
                case "GET":
                    return await controller.getCalendarData(event);
                case "POST":
                    return await controller.saveCalendarData(event);
                case "PATCH":
                    return await controller.updateCalendarData(event);
                default:
                    return {
                        statusCode: 405,
                        body: JSON.stringify({ message: "Method not allowed" })
                    }
            }
        })();
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Something went wrong, please contact support." })
        }
    }
}
