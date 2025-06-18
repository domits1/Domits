import {handler} from "../../functions/PropertyHandler/index.js";
import {PropertyController} from "../../functions/PropertyHandler/controller/propertyController.js";
import {describe, it, expect} from "@jest/globals";

describe("Routing unit tests", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("should handle a POST request", async () => {
        jest.spyOn(PropertyController.prototype, 'create').mockResolvedValue({statusCode: 201, body: "1"});

        const event = {httpMethod: "POST"};
        const response = await handler(event);

        expect(response.statusCode).toBe(201);
    });

    it("should handle a DELETE request", async () => {
        jest.spyOn(PropertyController.prototype, 'delete').mockResolvedValue({statusCode: 200, body: "Deleted"});

        const event = {httpMethod: "DELETE"};
        const response = await handler(event);

        expect(response.statusCode).toBe(200);
        expect(response.body).toBe("Deleted");
    });

    it("should handle a GET request for all properties on hostDashboard", async () => {
        jest.spyOn(PropertyController.prototype, 'getFullOwnedProperties').mockResolvedValue({statusCode: 200});

        const event = {
            httpMethod: "GET",
            resource: "/property/hostDashboard/{subResource}",
            pathParameters: {subResource: "all"},
        };
        const response = await handler(event);
        expect(response.statusCode).toBe(200);
    });

    it("should handle a GET request for a single property", async () => {
        jest.spyOn(PropertyController.prototype, 'getFullOwnedPropertyById').mockResolvedValue({statusCode: 200});

        const event = {
            httpMethod: "GET",
            resource: "/property/hostDashboard/{subResource}",
            pathParameters: {subResource: "single"},
        };
        const response = await handler(event);
        expect(response.statusCode).toBe(200);
    });

    it("should handle a GET request for properties by type", async () => {
        jest.spyOn(PropertyController.prototype, 'getActivePropertiesCardByType').mockResolvedValue({statusCode: 200});

        const event = {
            httpMethod: "GET",
            resource: "/property/bookingEngine/{subResource}",
            pathParameters: {subResource: "byType"},
        };
        const response = await handler(event);
        expect(response.statusCode).toBe(200);
    });

    it("should handle a GET request for all active properties", async () => {
        jest.spyOn(PropertyController.prototype, 'getActivePropertiesCard').mockResolvedValue({statusCode: 200});

        const event = {
            httpMethod: "GET",
            resource: "/property/bookingEngine/{subResource}",
            pathParameters: {subResource: "all"},
        };
        const response = await handler(event);
        expect(response.statusCode).toBe(200);
    });

    it("should handle a GET request for properties by hostId", async () => {
        jest.spyOn(PropertyController.prototype, 'getActivePropertiesCardByHostId').mockResolvedValue({statusCode: 200});

        const event = {
            httpMethod: "GET",
            resource: "/property/bookingEngine/{subResource}",
            pathParameters: {subResource: "byHostId"},
        };
        const response = await handler(event);
        expect(response.statusCode).toBe(200);
    });

    it("should handle a GET request for a set of properties", async () => {
        jest.spyOn(PropertyController.prototype, 'getActivePropertiesCardById').mockResolvedValue({statusCode: 200});

        const event = {
            httpMethod: "GET",
            resource: "/property/bookingEngine/{subResource}",
            pathParameters: {subResource: "set"},
        };
        const response = await handler(event);
        expect(response.statusCode).toBe(200);
    });

    it("should handle a GET request for listing details of an active property", async () => {
        jest.spyOn(PropertyController.prototype, 'getFullActivePropertyById').mockResolvedValue({statusCode: 200});

        const event = {
            httpMethod: "GET",
            resource: "/property/bookingEngine/{subResource}",
            pathParameters: {subResource: "listingDetails"},
        };
        const response = await handler(event);
        expect(response.statusCode).toBe(200);
    });

    it("should return 404 for unrecognized sub-resource for '/property/hostDashboard'", async () => {
        const event = {
            httpMethod: "GET",
            resource: "/property/hostDashboard/{subResource}",
            pathParameters: {subResource: "unknown"},
        };
        const response = await handler(event);
        expect(response.statusCode).toBe(404);
        expect(response.body).toBe("Sub-resource for '/property/hostDashboard' not found.");
    });

    it("should return 404 for unrecognized subResource '/property/bookingEngine'", async () => {
        const event = {
            httpMethod: "GET",
            resource: "/property/bookingEngine/{subResource}",
            pathParameters: {subResource: "unknown"},
        };
        const response = await handler(event);
        expect(response.statusCode).toBe(404);
        expect(response.body).toBe("Sub-resource for '/property/bookingEngine' not found.");
    });

    it("should return 404 for unrecognized HTTP method", async () => {
        const event = {httpMethod: "PUT"};
        const response = await handler(event);
        expect(response.statusCode).toBe(404);
        expect(response.body).toBe("Method not found.");
    });

    it("should return 404 for unrecognized path", async () => {
        const event = {httpMethod: "GET", resource: "some/path/that/does/not/exist", pathParameters: {}};
        const response = await handler(event);
        expect(response.statusCode).toBe(404);
        expect(response.body).toBe("Path not found.");
    });
});
