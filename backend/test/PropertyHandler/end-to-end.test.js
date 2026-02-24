import {handler} from "../../functions/PropertyHandler/index.js";
import {beforeAll, describe, it, expect} from "@jest/globals";
import {getGuestAuthToken} from "../util/getGuestAuthToken.js";
import {getPostEvent} from "./events/post";
import {getHostDashboardAllEvent} from "./events/get/hostDashboard/all";
import {bookingEngineByTypeEvent} from "./events/get/bookingEngine/byType";
import {bookingEngineAllEvent} from "./events/get/bookingEngine/all";
import {bookingEngineByHostIdEvent} from "./events/get/bookingEngine/byHostId";
import {bookingEngineInvalidSetEvent} from "./events/get/bookingEngine/invalidSet";
import {getHostAuthToken} from "../util/getHostAuthToken.js";

jest.setTimeout(50000); // temp fix for CI passing tests

describe("End-to-end tests", () => {
    let runtimePropertyId = "";

    beforeAll(async () => {
        const response = await handler(await getPostEvent());
        expect(response.statusCode).toBe(201);
        runtimePropertyId = String(response.body || "");
        expect(runtimePropertyId).toBeTruthy();
    }, 120000);

    describe("Patch request", () => {
        it("should throw a property not found exception", async () => {
            const response = await handler({
                httpMethod: "PATCH",
                body: JSON.stringify({
                    property: "SomeNonExistingProperty"
                }),
                headers: {
                    Authorization: await getHostAuthToken()
                }
            });

            expect(response.statusCode).toBe(404);
        });

        it("should throw a forbidden exception", async () => {
            const response = await handler({
                httpMethod: "PATCH",
                body: JSON.stringify({
                    property: runtimePropertyId
                }),
                headers: {
                    Authorization: await getGuestAuthToken()
                }
            });

            expect(response.statusCode).toBe(403);
        });

        it("should throw a already active property exception", async () => {
            const response = await handler({
                httpMethod: "PATCH",
                body: JSON.stringify({
                    property: runtimePropertyId
                }),
                headers: {
                    Authorization: await getHostAuthToken()
                }
            });

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body)).toBe("This property is already active.");
        });
    });

    describe("Post request", () => {
        it("should throw an unauthorized exception", async () => {
            const response = await handler({
                httpMethod: "POST",
                headers: {
                    Authorization: "NonAuthorizedToken"
                }
            });

            expect(response.statusCode).toBe(401);
        });

        it("should throw a forbidden exception", async () => {
            const response = await handler({
                httpMethod: "POST",
                headers: {
                    Authorization: await getGuestAuthToken()
                }
            });

            expect(response.statusCode).toBe(403);
        });

        it("should handle a POST request", async () => {
          const response = await handler(await getPostEvent());

          expect(response.statusCode).toBe(201);
          expect(response.body).toBeTruthy()
        });
    });

    describe("Host dashboard requests", () => {
      it("should handle GET all owned properties", async () => {
        const response = await handler(await getHostDashboardAllEvent());

        expect(response.statusCode).toBe(200);
      }, 120000);

      it("should handle GET single owned property by ID", async () => {
        const response = await handler({
            httpMethod: "GET",
            resource: "/property/hostDashboard/{subResource}",
            pathParameters: { subResource: "single" },
            queryStringParameters: { property: runtimePropertyId },
            headers: {
                Authorization: await getHostAuthToken(),
            },
        });

        expect(response.statusCode).toBe(200);
      });
    })

    describe("Booking engine requests", () => {
      it("should handle GET active properties by type", async () => {
        const response = await handler(bookingEngineByTypeEvent);

        expect(response.statusCode).toBe(200);
      });

      it("should handle GET all active properties", async () => {
        const response = await handler(bookingEngineAllEvent);

        expect(response.statusCode).toBe(200);
      });

      it("should handle GET active properties by host ID", async () => {
        const response = await handler(bookingEngineByHostIdEvent);

        expect(response.statusCode).toBe(200);
      });

      it("should handle GET set of active properties by ID", async () => {
        const response = await handler({
            httpMethod: "GET",
            resource: "/property/bookingEngine/{subResource}",
            pathParameters: { subResource: "set" },
            queryStringParameters: { properties: `${runtimePropertyId},${runtimePropertyId}` },
        });
        const data = JSON.parse(response.body);

        expect(response.statusCode).toBe(200);
        expect(data.length).toBe(2);
      });

      it("should error GET set of active properties by ID", async () => {
        const response = await handler(bookingEngineInvalidSetEvent);

        expect(response.statusCode).toBe(500);
        expect(response.body).toBe("\"You may only request 12 properties.\"");
      });

      it("should handle GET full active property by ID", async () => {
        const response = await handler({
            httpMethod: "GET",
            resource: "/property/bookingEngine/{subResource}",
            pathParameters: { subResource: "listingDetails" },
            queryStringParameters: { property: runtimePropertyId },
        });
        const data = JSON.parse(response.body);

        expect(response.statusCode).toBe(200);
        expect(data.property.id).toBe(runtimePropertyId);
      });
    });

    describe("Delete request", () => {
        it("should handle a DELETE request", async () => {
            const createResponse = await handler(await getPostEvent());
            expect(createResponse.statusCode).toBe(201);
            const propertyIdToDelete = String(createResponse.body || "");
            expect(propertyIdToDelete).toBeTruthy();

            const response = await handler({
                httpMethod: "DELETE",
                headers: {
                    Authorization: await getHostAuthToken(),
                },
                body: JSON.stringify({
                    property: propertyIdToDelete,
                }),
            });

            expect(response.statusCode).toBe(204);
        });
    });
});
