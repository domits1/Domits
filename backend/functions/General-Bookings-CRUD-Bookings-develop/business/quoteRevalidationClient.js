import { LambdaClient } from "@aws-sdk/client-lambda";
import { invokeLambdaHttpEvent as defaultInvokeLambdaHttpEvent } from "../.shared/lambdaHttpInvocation.js";
import {
  PUBLIC_BOOKING_REQUEST_ERROR_CODES,
  PublicBookingRequestError,
} from "../util/exception/PublicBookingRequestError.js";

const PUBLIC_QUOTE_RESOURCE = "/property/website/public/quote";
const QUOTE_CURRENCY = "EUR";
const QUOTE_SESSION_SOURCE = "standalone_site";

const serviceUnavailable = () =>
  new PublicBookingRequestError(
    PUBLIC_BOOKING_REQUEST_ERROR_CODES.BOOKING_SERVICE_UNAVAILABLE,
    "Live pricing and availability could not be confirmed. Please try again."
  );

class QuoteRevalidationClient {
  constructor({
    invokeLambdaHttpEvent = defaultInvokeLambdaHttpEvent,
    lambdaClient = new LambdaClient({ region: "eu-north-1" }),
    functionName = process.env.PROPERTY_HANDLER_FUNCTION_NAME || "PropertyHandler",
  } = {}) {
    this.invokeLambdaHttpEvent = invokeLambdaHttpEvent;
    this.lambdaClient = lambdaClient;
    this.functionName = functionName;
  }

  async requoteSite({ siteId, checkIn, checkOut, guests, sessionId, requestId }) {
    let invocation;
    try {
      invocation = await this.invokeLambdaHttpEvent({
        lambda: this.lambdaClient,
        functionName: this.functionName,
        event: {
          httpMethod: "POST",
          resource: PUBLIC_QUOTE_RESOURCE,
          path: PUBLIC_QUOTE_RESOURCE,
          headers: { "Content-Type": "application/json" },
          requestContext: { requestId },
          body: JSON.stringify({
            siteId,
            checkIn,
            checkOut,
            guests,
            currency: QUOTE_CURRENCY,
            session: { sessionId, source: QUOTE_SESSION_SOURCE },
          }),
        },
      });
    } catch (error) {
      console.error("Quote revalidation invoke failed.", error);
      throw serviceUnavailable();
    }

    const statusCode = Number(invocation?.lambdaBody?.statusCode);
    const responseBody = invocation?.responseBody;

    if (statusCode >= 200 && statusCode < 300) {
      if (!responseBody?.quoteId || !responseBody?.priceBreakdown) {
        throw serviceUnavailable();
      }
      return { ok: true, quote: responseBody };
    }

    return {
      ok: false,
      status: Number.isFinite(statusCode) && statusCode > 0 ? statusCode : 502,
      code: String(responseBody?.error?.code || ""),
      message: String(responseBody?.error?.message || ""),
    };
  }
}

export default QuoteRevalidationClient;
