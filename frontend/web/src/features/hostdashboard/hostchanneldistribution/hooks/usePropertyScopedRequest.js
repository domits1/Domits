import { useEffect, useMemo, useState } from "react";

export const PROPERTY_REQUEST_STATE = {
  IDLE: "idle",
  LOADING: "loading",
  LOADED: "loaded",
  // The user has no Channex integration (HTTP 404 CHANNEX_NOT_FOUND): the status card already explains it.
  UNAVAILABLE: "unavailable",
  ERROR: "error",
};

const HTTP_NOT_FOUND = 404;
const CHANNEX_NOT_FOUND_CODE = "CHANNEX_NOT_FOUND";

const isIntegrationNotFound = (err) =>
  err?.status === HTTP_NOT_FOUND && err?.responseBody?.errorCode === CHANNEX_NOT_FOUND_CODE;

// Loads data of one property. Without a property nothing is requested and the state stays IDLE. A
// property change drops the previous data at once, and a response that arrives for a property that
// is no longer selected is ignored. `request` and `select` must be stable (module-level) functions.
export function usePropertyScopedRequest({ propertyId, request, select, errorMessage }) {
  // Every result remembers its property, so a result is never shown for another property. Without
  // that, the render in which the selection changes would pair the previous property's data with
  // the new property, because the effect below only runs after that render.
  const [result, setResult] = useState({ propertyId: null, data: null, loadState: PROPERTY_REQUEST_STATE.LOADING });

  useEffect(() => {
    if (!propertyId) return undefined;

    let cancelled = false;
    const settle = (data, loadState) => {
      if (!cancelled) setResult({ propertyId, data, loadState });
    };

    settle(null, PROPERTY_REQUEST_STATE.LOADING);
    request(propertyId)
      .then((response) => settle(select(response), PROPERTY_REQUEST_STATE.LOADED))
      .catch((err) => {
        if (cancelled) return;
        if (isIntegrationNotFound(err)) {
          settle(null, PROPERTY_REQUEST_STATE.UNAVAILABLE);
          return;
        }
        // The host sees a fixed sentence; the real detail goes to the console.
        console.error(errorMessage, err);
        settle(null, PROPERTY_REQUEST_STATE.ERROR);
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId, request, select, errorMessage]);

  return useMemo(() => {
    if (!propertyId) return { data: null, loadState: PROPERTY_REQUEST_STATE.IDLE };
    if (result.propertyId !== propertyId) return { data: null, loadState: PROPERTY_REQUEST_STATE.LOADING };
    return { data: result.data, loadState: result.loadState };
  }, [propertyId, result]);
}
