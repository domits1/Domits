import { expect, it, jest, test } from '@jest/globals';
import { handler } from "../../functions/General-Bookings-CRUD-Bookings-develop/index.js";

import PostRequestModel from "./events/post.js";
import GetbyHostIdRequestModel from "./events/getByHostId.js";
import GetbyPropertyIdRequestModel from "./events/getByPropertyId.js";
import GetByGuestIdModel from "./events/getByGuestId.js";
import GetByCreatedAtModel from "./events/getByCreatedAtDate.js";
import GetByPaymentIdModel from "./events/getByPaymentId.js";
import getByDepartureDateModel from "./events/getByDepartureDate.js";
import GetbyHostIdSinglePropertyRequestModel from "./events/GetbyHostIdSingleProperty.js";

jest.setTimeout(20000);

// This test tests the end-to-end functionality of the booking engine. It tests all possible
// GET scenarios, including the POST request to create a booking.
// A dummy account is used to test the booking engine, and has been given dummy data to work with.
describe("booking end-to-end", () => {
    it("should receive a POST request to create a booking", async () => {
        const response = await handler(await PostRequestModel);
        expect(response.statusCode).toBe(201, 404); // expects 404 if user has no stripe account
    })

    it("should receive a GET request queried on a HostID", async () => {
        const response = await handler(await GetbyHostIdRequestModel);
        expect([200, 404]).toContain(response.statusCode);

    })

    it("should receive a GET request queried on a HostID, and return one property", async () => {
        const response = await handler(await GetbyHostIdSinglePropertyRequestModel);
        expect([200, 404]).toContain(response.statusCode);
    })

    it("should receive a GET request queried on a property ID", async () => {
        const response = await handler(await GetbyPropertyIdRequestModel);
        expect([200, 404, 501]).toContain(response.statusCode);

    })

    it("should receive a GET request queried on a guest ID", async () => {
        const response = await handler(await GetByGuestIdModel);
        expect([200, 404]).toContain(response.statusCode);

    })

    it("should receive a GET request queried with dates when checked in and checked out", async () => {
        const response = await handler(await GetByCreatedAtModel);
        expect([200, 404]).toContain(response.statusCode);

    })

    it("should receive a GET request queried on a payment ID", async () => {
        const response = await handler(await GetByPaymentIdModel);
        expect([200, 404]).toContain(response.statusCode);
    })

    it("should receive a GET request queried on a departure date", async () => {
        const response = await handler(await getByDepartureDateModel);
        expect([200, 404]).toContain(response.statusCode);

    })
});
