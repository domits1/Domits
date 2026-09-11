import { useCallback, useEffect, useRef, useState } from "react";
import {
  WEBSITE_PUBLIC_BOOKING_CLIENT_ERROR_CODES,
  WebsitePublicBookingError,
  requestPublicSiteBooking,
} from "../../services/websitePublicBookingService";
import { clearBookingIdempotencyKey, getOrCreateBookingIdempotencyKey } from "./bookingRequestIdempotency";

export const BOOKING_REQUEST_STATUS = Object.freeze({
  IDLE: "idle",
  SUBMITTING: "submitting",
  SUCCESS: "success",
  ERROR: "error",
});

const IDEMPOTENCY_KEY_REUSED_CODE = "idempotency_key_reused";

const INITIAL_STATE = Object.freeze({
  status: BOOKING_REQUEST_STATUS.IDLE,
  result: null,
  error: null,
});

const toBookingError = (error) =>
  error instanceof WebsitePublicBookingError
    ? error
    : new WebsitePublicBookingError({ code: WEBSITE_PUBLIC_BOOKING_CLIENT_ERROR_CODES.UNEXPECTED_RESPONSE });

export const useWebsiteBookingRequest = ({ siteId, sessionId }) => {
  const [state, setState] = useState(INITIAL_STATE);
  const abortControllerRef = useRef(null);

  const submitBookingRequest = useCallback(
    async ({ quote, guest }) => {
      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      setState({ status: BOOKING_REQUEST_STATUS.SUBMITTING, result: null, error: null });

      const send = (idempotencyKey) =>
        requestPublicSiteBooking({
          siteId,
          quoteToken: quote.quoteToken,
          guest,
          sessionId,
          idempotencyKey,
          signal: abortController.signal,
        });

      try {
        let result;
        try {
          result = await send(getOrCreateBookingIdempotencyKey({ siteId, quoteId: quote.quoteId }));
        } catch (error) {
          if (error?.code !== IDEMPOTENCY_KEY_REUSED_CODE) {
            throw error;
          }
          clearBookingIdempotencyKey(siteId);
          result = await send(getOrCreateBookingIdempotencyKey({ siteId, quoteId: quote.quoteId }));
        }

        if (abortController.signal.aborted) {
          return { ok: false, aborted: true };
        }
        clearBookingIdempotencyKey(siteId);
        setState({ status: BOOKING_REQUEST_STATUS.SUCCESS, result, error: null });
        return { ok: true, result };
      } catch (error) {
        if (abortController.signal.aborted || error?.name === "AbortError") {
          return { ok: false, aborted: true };
        }
        const bookingError = toBookingError(error);
        setState({ status: BOOKING_REQUEST_STATUS.ERROR, result: null, error: bookingError });
        return { ok: false, error: bookingError };
      }
    },
    [sessionId, siteId]
  );

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    setState(INITIAL_STATE);
  }, []);

  useEffect(() => () => abortControllerRef.current?.abort(), []);

  return { ...state, submitBookingRequest, reset };
};
