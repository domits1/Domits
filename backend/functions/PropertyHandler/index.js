import { PropertyController } from "./controller/propertyController.js";

let controller = new PropertyController();

export const handler = async (event) => {
    if (!controller) {
        controller = new PropertyController();
    }
    try {
        return await (async () => {
            switch (event.httpMethod) {
                case "POST":
                    return await controller.create(event);
                case "PATCH":
                    return await controller.activateProperty(event);
                case "GET":
                    const path = event.resource;
                    const subResource = event.pathParameters.subResource;
                    switch (path) {
                        case "/property/hostDashboard/{subResource}":
                            switch (subResource) {
                                case "all":
                                    return await controller.getFullOwnedProperties(event);
                                case "single":
                                    return await controller.getFullOwnedPropertyById(event);
                                case "calendarData":
                                    return await controller.getCalendarData(event);
                                default:
                                    return {
                                        statusCode: 404,
                                        body: "Sub-resource for '/property/hostDashboard' not found."
                                    }
                            }
                        case "/property/bookingEngine/{subResource}":
                            switch (subResource) {
                                case "byType":
                                    return await controller.getActivePropertiesCardByType(event);
                                case "all":
                                    return await controller.getActivePropertiesCard(event);
                                case "byCountry":
                                    return await controller.getActivePropertiesCardByCountry(event);
                                case "byHostId":
                                    return await controller.getActivePropertiesCardByHostId(event);
                                case "set":
                                    return await controller.getActivePropertiesCardById(event);
                                case "listingDetails":
                                    return await controller.getFullActivePropertyById(event);
                                case "booking":
                                    return await controller.getFullPropertyByBookingId(event);
                                default:
                                    return {
                                        statusCode: 404,
                                        body: "Sub-resource for '/property/bookingEngine' not found."
                                    }
                            }
                        default:
                            return {
                                statusCode: 404,
                                body: "Path not found."
                            }
                    }
                case "PUT":
                    const putPath = event.resource;
                    const putSubResource = event.pathParameters.subResource;
                    switch (putPath) {
                        case "/property/{subResource}":
                            switch (putSubResource) {
                                case "availability":
                                    return await controller.updateAvailability(event);
                                case "pricing":
                                    return await controller.updatePricing(event);
                                default:
                                    return {
                                        statusCode: 404,
                                        body: "Sub-resource for '/property' PUT not found."
                                    }
                            }
                        default:
                            return {
                                statusCode: 404,
                                body: "PUT path not found."
                            }
                    }
                case "DELETE":
                    return await controller.delete(event);
                default:
                    return {
                        statusCode: 404,
                        body: "Method not found."
                    }
            }
        }
        )();
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: "Something went wrong, please contact support."
        }
    }
}