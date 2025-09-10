import BookingController from "../controller/controller.js";


export const handler = async (event) => {
    switch (event.httpMethod) {
        case "GET":
            return await BookingController(event);
        default:
            return { statusCode: 405, body: "Method Not Allowed" };
    }
};
