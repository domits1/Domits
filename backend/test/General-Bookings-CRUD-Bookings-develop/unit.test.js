import {expect, it} from '@jest/globals';
import {handler} from "../../functions/General-Bookings-CRUD-Bookings-develop/index" 
import {ParseEvent} from "../../functions/General-Bookings-CRUD-Bookings-develop/business/parseEvent"

jest.mock("@aws-sdk/credential-provider-node", () => ({
    fromIni: jest.fn().mockReturnValue(() => Promise.resolve({ accessKeyId: "fake", secretAccessKey: "fake" }))
  }));
  
// Tests classes on happy/unhappy paths
describe("BookingEngine (General-Bookings-CRUD-Bookings-develop) function testing /index.js | parseEvent.js", () => {
    it("should return CORS headers for OPTIONS preflight", async () => {
        const response = await handler({
            httpMethod: "OPTIONS",
            path: "/development/bookings/d4af03d3-e8c5-431d-84db-8d3516fe0320/cancel",
            headers: {
                Origin: "http://localhost:3000",
                "Access-Control-Request-Method": "PATCH",
                "Access-Control-Request-Headers": "authorization,content-type",
            },
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers["Access-Control-Allow-Origin"]).toBe("*");
        expect(response.headers["Access-Control-Allow-Methods"]).toContain("OPTIONS");
        expect(response.headers["Access-Control-Allow-Methods"]).toContain("PATCH");
        expect(response.headers["Access-Control-Allow-Headers"]).toContain("Authorization");
    })

    it("should route cancel-booking PATCH action through the existing bookings endpoint", async () => {
        const response = await handler({
            httpMethod: "PATCH",
            path: "/development/bookings",
            headers: {},
            body: JSON.stringify({
                action: "cancel-booking",
                bookingId: "d4af03d3-e8c5-431d-84db-8d3516fe0320",
            }),
        });

        expect(response.statusCode).toBe(401);
        expect(response.headers["Access-Control-Allow-Origin"]).toBe("*");
        expect(response.body).toContain("Missing Authorization header.");
    })

    it("should throw error at invalid httpMethod", async () => {
        await expect(handler({httpMethod: "fake"}))
            .rejects
            .toThrow("Unable to determine request type. Please contact the Admin.");
    })
    it("should throw error at empty POST", async () => {
        await expect(handler({httpMethod: "POST"}))
            .rejects
            .toThrow("Unable to parse your request!");
    })
    it("should throw error at empty GET", async () => {
        await expect(handler({httpMethod: "GET"}))
            .rejects
            .toThrow("Unable to parse your request");
    })
    it("should throw error at empty PATCH", async () => {
        expect(handler({httpMethod: "PATCH"}))
            .rejects;
    })
})
