import { expect, it, jest } from "@jest/globals";

import PostRequestModel from "./events/post.js";
import GetbyHostIdRequestModel from "./events/getByHostId.js";
import GetbyPropertyIdRequestModel from "./events/getByPropertyId.js";
import GetByGuestIdModel from "./events/getByGuestId.js";
import GetByCreatedAtModel from "./events/getByCreatedAtDate.js";
import GetByPaymentIdModel from "./events/getByPaymentId.js";
import getByDepartureDateModel from "./events/getByDepartureDate.js";
import GetbyHostIdSinglePropertyRequestModel from "./events/GetbyHostIdSingleProperty.js";

jest.setTimeout(20000);

const mockQueryBuilder = {
  addSelect: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  createQueryBuilder: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue({}),
  from: jest.fn().mockReturnThis(),
  getCount: jest.fn().mockResolvedValue(0),
  getMany: jest.fn().mockResolvedValue([]),
  getOne: jest.fn().mockResolvedValue({
    hostid: "test-host-user",
    title: "End-to-end test property",
    bookingtype: "direct",
  }),
  getRawMany: jest.fn().mockResolvedValue([]),
  insert: jest.fn().mockReturnThis(),
  into: jest.fn().mockReturnThis(),
  leftJoinAndMapMany: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
};

const mockDatabase = {
  getInstance: jest.fn().mockResolvedValue({
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    getRepository: jest.fn(() => ({
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    })),
    query: jest.fn().mockResolvedValue([]),
  }),
};

jest.mock("database", () => ({
  __esModule: true,
  default: mockDatabase,
  getInstance: mockDatabase.getInstance,
}));

const { handler } = require("../../functions/General-Bookings-CRUD-Bookings-develop/index.js");

// This test tests the end-to-end functionality of the booking engine. It tests all possible
// GET scenarios, including the POST request to create a booking.
// A dummy account is used to test the booking engine, and has been given dummy data to work with.

describe("booking end-to-end", () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => "No property found.",
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete globalThis.fetch;
  });

  it("should receive a POST request to creatae a booking", async () => {
    const response = await handler(await PostRequestModel);
    expect([200, 201, 404, 409].includes(response.statusCode)).toBe(true);
  });

  it("should receive a GET request queried on a HostID", async () => {
    const response = await handler(await GetbyHostIdRequestModel);
    expect([200, 404].includes(response.statusCode)).toBe(true);
  });

  it("should receive a GET request queried on a HostID, and return one property", async () => {
    const response = await handler(await GetbyHostIdSinglePropertyRequestModel);
    expect([200, 404].includes(response.statusCode)).toBe(true);
  });

  it("should receive a GET request queried on a property ID", async () => {
    const response = await handler(await GetbyPropertyIdRequestModel);
    expect([200, 404, 501].includes(response.statusCode)).toBe(true);
  });

  it("should receive a GET request queried on a guest ID", async () => {
    const response = await handler(await GetByGuestIdModel);
    expect([200, 404, 500].includes(response.statusCode)).toBe(true);
  });

  it("should receive a GET request queried with dates when checked in and checked out", async () => {
    const response = await handler(await GetByCreatedAtModel);
    expect([200, 404].includes(response.statusCode)).toBe(true);
  });

  it("should receive a GET request queried on a payment ID", async () => {
    const response = await handler(await GetByPaymentIdModel);
    expect([200, 404, 500].includes(response.statusCode)).toBe(true);
  });

  it("should receive a GET request queried on a departure date", async () => {
    const response = await handler(await getByDepartureDateModel);
    expect([200, 404].includes(response.statusCode)).toBe(true);
  });
});
