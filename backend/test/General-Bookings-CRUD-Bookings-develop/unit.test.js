import {expect, it} from '@jest/globals';
import {handler} from "../../functions/General-Bookings-CRUD-Bookings-develop/index" 
import {ParseEvent} from "../../functions/General-Bookings-CRUD-Bookings-develop/business/parseEvent"

jest.mock("@aws-sdk/credential-provider-node", () => ({
    fromIni: jest.fn().mockReturnValue(() => Promise.resolve({ accessKeyId: "fake", secretAccessKey: "fake" }))
  }));
  
// Tests classes on happy/unhappy paths
describe("BookingEngine (General-Bookings-CRUD-Bookings-develop) function testing /index.js | parseEvent.js", () => {
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
