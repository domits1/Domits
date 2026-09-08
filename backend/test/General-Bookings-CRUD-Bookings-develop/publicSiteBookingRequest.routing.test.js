import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { handler } from "../../functions/General-Bookings-CRUD-Bookings-develop/index.js";
import ReservationController from "../../functions/General-Bookings-CRUD-Bookings-develop/controller/reservationController.js";

jest.mock("@aws-sdk/credential-provider-node", () => ({
  fromIni: jest.fn().mockReturnValue(() => Promise.resolve({ accessKeyId: "fake", secretAccessKey: "fake" })),
}));

const PUBLIC_BOOKING_EVENT = {
  httpMethod: "POST",
  resource: "/public/sites/{siteId}/bookings",
  path: "/development/public/sites/site-1/bookings",
  pathParameters: { siteId: "site-1" },
  headers: { "idempotency-key": "idem-1" },
  body: JSON.stringify({ quoteToken: "qtok_abc", guest: { name: "Guest", email: "guest@example.com" } }),
  requestContext: { requestId: "req-1" },
};

describe("public site booking request routing", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("hands the raw event to the controller before the generic parser runs", async () => {
    const spy = jest
      .spyOn(ReservationController.prototype, "createPublicSiteBookingRequest")
      .mockResolvedValue({ statusCode: 201, headers: { "Access-Control-Allow-Origin": "*" }, body: "{}" });

    const response = await handler(PUBLIC_BOOKING_EVENT);

    expect(spy).toHaveBeenCalledWith(PUBLIC_BOOKING_EVENT);
    expect(response.statusCode).toBe(201);
  });

  it("matches the route by path when the resource template is absent", async () => {
    const spy = jest
      .spyOn(ReservationController.prototype, "createPublicSiteBookingRequest")
      .mockResolvedValue({ statusCode: 201, headers: {}, body: "{}" });

    await handler({ ...PUBLIC_BOOKING_EVENT, resource: undefined });

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("leaves ordinary booking POSTs on the existing create path", async () => {
    const spy = jest.spyOn(ReservationController.prototype, "createPublicSiteBookingRequest");
    jest.spyOn(ReservationController.prototype, "create").mockResolvedValue({ statusCode: 401, response: {} });

    await handler({ httpMethod: "POST", resource: "/bookings", path: "/development/bookings", headers: {}, body: "{}" });

    expect(spy).not.toHaveBeenCalled();
  });

  it("returns a 500 with CORS headers when the public route throws", async () => {
    jest.spyOn(ReservationController.prototype, "createPublicSiteBookingRequest").mockRejectedValue(new Error("boom"));

    const response = await handler(PUBLIC_BOOKING_EVENT);

    expect(response.statusCode).toBe(500);
    expect(response.headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(JSON.parse(response.body).error.code).toBe("internal_error");
  });

  it("advertises Idempotency-Key in the CORS preflight response", async () => {
    const response = await handler({ httpMethod: "OPTIONS", path: "/development/public/sites/site-1/bookings", headers: {} });

    expect(response.statusCode).toBe(200);
    expect(response.headers["Access-Control-Allow-Headers"]).toContain("Idempotency-Key");
  });
});
