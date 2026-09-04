import { useCallback, useEffect, useRef, useState } from "react";
import {
  WEBSITE_PUBLIC_QUOTE_CLIENT_ERROR_CODES,
  WebsitePublicQuoteError,
  requestPublicWebsiteQuote,
} from "../../services/websitePublicQuoteService";

export const QUOTE_STATUS = Object.freeze({
  IDLE: "idle",
  LOADING: "loading",
  SUCCESS: "success",
  STALE: "stale",
  ERROR: "error",
});

export const QUOTE_STALE_REASONS = Object.freeze({
  CHANGED: "changed",
  EXPIRED: "expired",
});

const EXPIRY_CHECK_INTERVAL_MS = 30_000;

const INITIAL_STATE = Object.freeze({
  status: QUOTE_STATUS.IDLE,
  quote: null,
  error: null,
  staleReason: null,
});

const toQuoteError = (error) =>
  error instanceof WebsitePublicQuoteError
    ? error
    : new WebsitePublicQuoteError({ code: WEBSITE_PUBLIC_QUOTE_CLIENT_ERROR_CODES.UNEXPECTED_RESPONSE });

export const useWebsiteQuote = ({ siteId, sessionId }) => {
  const [state, setState] = useState(INITIAL_STATE);
  const abortControllerRef = useRef(null);

  const requestQuote = useCallback(
    async ({ checkIn, checkOut, guests }) => {
      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      setState((currentState) => ({ ...currentState, status: QUOTE_STATUS.LOADING, error: null }));

      try {
        const quote = await requestPublicWebsiteQuote({
          siteId,
          checkIn,
          checkOut,
          guests,
          sessionId,
          signal: abortController.signal,
        });
        if (abortController.signal.aborted) {
          return { ok: false, aborted: true };
        }
        setState({ status: QUOTE_STATUS.SUCCESS, quote, error: null, staleReason: null });
        return { ok: true, quote };
      } catch (error) {
        if (abortController.signal.aborted || error?.name === "AbortError") {
          return { ok: false, aborted: true };
        }
        const quoteError = toQuoteError(error);
        setState({ status: QUOTE_STATUS.ERROR, quote: null, error: quoteError, staleReason: null });
        return { ok: false, error: quoteError };
      }
    },
    [sessionId, siteId]
  );

  const markStale = useCallback((reason = QUOTE_STALE_REASONS.CHANGED) => {
    setState((currentState) =>
      currentState.quote ? { ...currentState, status: QUOTE_STATUS.STALE, staleReason: reason } : currentState
    );
  }, []);

  const notifySelectionChanged = useCallback(() => {
    setState((currentState) => {
      if (currentState.quote) {
        return { ...currentState, status: QUOTE_STATUS.STALE, staleReason: QUOTE_STALE_REASONS.CHANGED };
      }
      if (currentState.status === QUOTE_STATUS.ERROR) {
        return INITIAL_STATE;
      }
      return currentState;
    });
  }, []);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    setState(INITIAL_STATE);
  }, []);

  useEffect(() => {
    if (state.status !== QUOTE_STATUS.SUCCESS) {
      return undefined;
    }

    const checkExpiry = () => {
      const expiresAtMs = Date.parse(state.quote?.expiresAt);
      if (Number.isFinite(expiresAtMs) && Date.now() >= expiresAtMs) {
        markStale(QUOTE_STALE_REASONS.EXPIRED);
      }
    };

    checkExpiry();
    const intervalId = globalThis.setInterval(checkExpiry, EXPIRY_CHECK_INTERVAL_MS);
    return () => globalThis.clearInterval(intervalId);
  }, [markStale, state.quote, state.status]);

  useEffect(() => () => abortControllerRef.current?.abort(), []);

  return { ...state, requestQuote, markStale, notifySelectionChanged, reset };
};
