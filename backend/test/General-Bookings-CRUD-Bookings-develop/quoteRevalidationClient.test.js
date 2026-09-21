import { describe, expect, it, jest } from "@jest/globals";
import QuoteRevalidationClient from "../../functions/General-Bookings-CRUD-Bookings-develop/business/quoteRevalidationClient.js";
import { PublicBookingRequestError } from "../../functions/General-Bookings-CRUD-Bookings-develop/util/exception/PublicBookingRequestError.js";

const QUOTE_INPUT = {
  siteId: "site-1",
  checkIn: "2026-10-01",
  checkOut: "2026-10-05",
  guests: 2,
  sessionId: "visitor-1",
  requestId: "req-1",
};

const buildClient = (invokeResult) => {
  const invokeLambdaHttpEvent = jest.fn(async () => invokeResult);
  const client = new QuoteRevalidationClient({
    invokeLambdaHttpEvent,
    lambdaClient: { send: jest.fn() },
    functionName: "PropertyHandler",
  });
  return { client, invokeLambdaHttpEvent };
};

describe("QuoteRevalidationClient.requoteSite", () => {
  it("invokes PropertyHandler's public quote route with the design-pack body", async () => {
    const quote = { quoteId: "quote_2", priceBreakdown: { total: 81000 } };
    const { client, invokeLambdaHttpEvent } = buildClient({
      lambdaBody: { statusCode: 200, body: JSON.stringify(quote) },
      responseBody: quote,
    });

    const result = await client.requoteSite(QUOTE_INPUT);

    expect(result).toEqual({ ok: true, quote });
    const [{ functionName, event }] = invokeLambdaHttpEvent.mock.calls[0];
    expect(functionName).toBe("PropertyHandler");
    expect(event.httpMethod).toBe("POST");
    expect(event.resource).toBe("/property/website/public/quote");
    expect(event.path).toBe("/property/website/public/quote");
    expect(event.headers).toEqual({ "Content-Type": "application/json" });
    expect(event.requestContext).toEqual({ requestId: "req-1" });
    expect(JSON.parse(event.body)).toEqual({
      siteId: "site-1",
      checkIn: "2026-10-01",
      checkOut: "2026-10-05",
      guests: 2,
      currency: "EUR",
      session: { sessionId: "visitor-1", source: "standalone_site" },
    });
  });

  it("returns the quote endpoint's error code, status and message on a non-2xx response", async () => {
    const errorBody = { error: { code: "unavailable_dates", message: "Taken.", requestId: "req-9" } };
    const { client } = buildClient({
      lambdaBody: { statusCode: 409, body: JSON.stringify(errorBody) },
      responseBody: errorBody,
    });

    await expect(client.requoteSite(QUOTE_INPUT)).resolves.toEqual({
      ok: false,
      status: 409,
      code: "unavailable_dates",
      message: "Taken.",
    });
  });

  it("treats a 2xx without a quote body as a service failure", async () => {
    const { client } = buildClient({ lambdaBody: { statusCode: 200, body: "" }, responseBody: null });

    await expect(client.requoteSite(QUOTE_INPUT)).rejects.toMatchObject({
      code: "booking_service_unavailable",
    });
  });

  it("maps an invoke failure to booking_service_unavailable", async () => {
    const invokeLambdaHttpEvent = jest.fn(async () => {
      throw new Error("AccessDeniedException");
    });
    const client = new QuoteRevalidationClient({ invokeLambdaHttpEvent, lambdaClient: {}, functionName: "PropertyHandler" });

    const promise = client.requoteSite(QUOTE_INPUT);
    await expect(promise).rejects.toBeInstanceOf(PublicBookingRequestError);
    await expect(promise).rejects.toMatchObject({ code: "booking_service_unavailable", statusCode: 503 });
  });
});
