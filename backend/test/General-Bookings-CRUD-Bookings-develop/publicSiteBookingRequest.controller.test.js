import { describe, expect, it, jest } from "@jest/globals";
import ReservationController from "../../functions/General-Bookings-CRUD-Bookings-develop/controller/reservationController.js";
import { PublicBookingRequestError } from "../../functions/General-Bookings-CRUD-Bookings-develop/util/exception/PublicBookingRequestError.js";

jest.mock("@aws-sdk/credential-provider-node", () => ({
  fromIni: jest.fn().mockReturnValue(() => Promise.resolve({ accessKeyId: "fake", secretAccessKey: "fake" })),
}));

const REQUEST_BODY = {
  quoteToken: "qtok_abc",
  guest: { name: "Guest Name", email: "guest@example.com" },
  session: { sessionId: "visitor-1", source: "standalone_site" },
};

const SERVICE_RESULT = {
  statusCode: 201,
  response: {
    publicBookingRef: "DBW-ABCDEFGHJK",
    status: "REQUESTED",
    siteId: "site-1",
    checkIn: "2026-10-01",
    checkOut: "2026-10-05",
    guests: 2,
    total: 81000,
    currency: "EUR",
  },
};

const buildEvent = ({
  body = REQUEST_BODY,
  headers = { "idempotency-key": "idem-1", "content-type": "application/json" },
  pathParameters = { siteId: "site-1" },
  path = "/development/public/sites/site-1/bookings",
  requestContext = { requestId: "req-1" },
} = {}) => ({
  httpMethod: "POST",
  resource: "/public/sites/{siteId}/bookings",
  path,
  pathParameters,
  headers,
  body: typeof body === "string" ? body : JSON.stringify(body),
  requestContext,
});

const buildController = (createBookingRequest = jest.fn().mockResolvedValue(SERVICE_RESULT)) => {
  const controller = new ReservationController();
  controller.publicSiteBookingRequestService = { createBookingRequest };
  return controller;
};

const parseBody = (response) => JSON.parse(response.body);

describe("ReservationController.createPublicSiteBookingRequest", () => {
  it("returns 201 with the service response and CORS headers", async () => {
    const controller = buildController();

    const response = await controller.createPublicSiteBookingRequest(buildEvent());

    expect(response.statusCode).toBe(201);
    expect(response.headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(parseBody(response)).toEqual(SERVICE_RESULT.response);
    expect(controller.publicSiteBookingRequestService.createBookingRequest).toHaveBeenCalledWith({
      siteId: "site-1",
      idempotencyKey: "idem-1",
      quoteToken: "qtok_abc",
      guest: { name: "Guest Name", email: "guest@example.com" },
      session: { sessionId: "visitor-1", source: "standalone_site" },
      requestId: "req-1",
    });
  });

  it("reads the Idempotency-Key header regardless of casing", async () => {
    const controller = buildController();

    await controller.createPublicSiteBookingRequest(buildEvent({ headers: { "Idempotency-Key": "idem-2" } }));

    expect(controller.publicSiteBookingRequestService.createBookingRequest).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: "idem-2" })
    );
  });

  it("derives the siteId from the path when no path parameters are present", async () => {
    const controller = buildController();

    await controller.createPublicSiteBookingRequest(
      buildEvent({ pathParameters: null, path: "/development/public/sites/site-9/bookings" })
    );

    expect(controller.publicSiteBookingRequestService.createBookingRequest).toHaveBeenCalledWith(
      expect.objectContaining({ siteId: "site-9" })
    );
  });

  it.each([
    ["malformed JSON", "{not json"],
    ["a non-object body", JSON.stringify("text")],
  ])("rejects %s as 400 invalid_request without calling the service", async (_label, body) => {
    const controller = buildController();

    const response = await controller.createPublicSiteBookingRequest(buildEvent({ body }));

    expect(response.statusCode).toBe(400);
    expect(parseBody(response).error).toMatchObject({ code: "invalid_request", requestId: "req-1" });
    expect(controller.publicSiteBookingRequestService.createBookingRequest).not.toHaveBeenCalled();
  });

  it("maps a PublicBookingRequestError to its status and the error body shape", async () => {
    const controller = buildController(
      jest.fn().mockRejectedValue(new PublicBookingRequestError("quote_expired", "Your quote is no longer valid."))
    );

    const response = await controller.createPublicSiteBookingRequest(buildEvent());

    expect(response.statusCode).toBe(409);
    expect(response.headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(parseBody(response)).toEqual({
      error: { code: "quote_expired", message: "Your quote is no longer valid.", requestId: "req-1" },
    });
  });

  it("returns a generic 500 internal_error without leaking the failure detail", async () => {
    const controller = buildController(jest.fn().mockRejectedValue(new Error("boom: secret details")));

    const response = await controller.createPublicSiteBookingRequest(buildEvent());

    expect(response.statusCode).toBe(500);
    const { error } = parseBody(response);
    expect(error.code).toBe("internal_error");
    expect(error.requestId).toBe("req-1");
    expect(error.message).not.toContain("boom");
  });

  it("generates a requestId when API Gateway does not provide one", async () => {
    const controller = buildController();

    await controller.createPublicSiteBookingRequest(buildEvent({ requestContext: undefined }));

    const { requestId } = controller.publicSiteBookingRequestService.createBookingRequest.mock.calls[0][0];
    expect(typeof requestId).toBe("string");
    expect(requestId.length).toBeGreaterThan(0);
  });
});
