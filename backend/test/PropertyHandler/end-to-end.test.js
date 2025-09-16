import {handler} from "../../functions/PropertyHandler/index.js";
import {describe, it, expect} from "@jest/globals";
import {getGuestAuthToken} from "../util/getGuestAuthToken.js";
import {getPostEvent} from "./events/post";
import {getDeleteEvent} from "./events/delete";
import {getHostDashboardAllEvent} from "./events/get/hostDashboard/all";
import {getHostDashboardSingleEvent} from "./events/get/hostDashboard/single";
import {bookingEngineByTypeEvent} from "./events/get/bookingEngine/byType";
import {bookingEngineAllEvent} from "./events/get/bookingEngine/all";
import {bookingEngineByHostIdEvent} from "./events/get/bookingEngine/byHostId";
import {bookingEngineSetEvent} from "./events/get/bookingEngine/set";
import {bookingEngineListingDetailsEvent} from "./events/get/bookingEngine/listingDetails";
import {bookingEngineInvalidSetEvent} from "./events/get/bookingEngine/invalidSet";
import {getHostAuthToken} from "../util/getHostAuthToken.js";

describe("End-to-end tests", () => {

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
                    property: "42a335b3-e72e-49ee-bc8d-ed61e9bd35e5"
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
                    property: "42a335b3-e72e-49ee-bc8d-ed61e9bd35e5"
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

    describe("Delete request", () => {
        it("should handle a DELETE request", async () => {
            const response = await handler(await getDeleteEvent());

            expect(response.statusCode).toBe(204);
        });
    });

    describe("Host dashboard requests", () => {
      it("should handle GET all owned properties", async () => {
        const response = await handler(await getHostDashboardAllEvent());

        expect(response.statusCode).toBe(200);
      });

      it("should handle GET single owned property by ID", async () => {
        const response = await handler(await getHostDashboardSingleEvent());

        expect(response.statusCode).toBe(200);
      });
    }, 50000)

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
        const response = await handler(bookingEngineSetEvent);
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
        const response = await handler(bookingEngineListingDetailsEvent);
        const data = JSON.parse(response.body);

        expect(response.statusCode).toBe(200);
        expect(data.property.id).toBe("42a335b3-e72e-49ee-bc8d-ed61e9bd35e5");
      });
    }, 50000);
});