import { useEffect, useMemo, useState } from "react";
import { getLatestSyncEvidence } from "../services/channexDistributionService";

export const LATEST_SYNC_STATE = {
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

// Loads the latest sync evidence of one property. Without a property the endpoint answers 400, so
// nothing is requested and the state stays IDLE. A property change drops the previous item at once,
// and a response that arrives for a property that is no longer selected is ignored.
// The request carries no user id: the backend identifies the user from the token.
export function useLatestSyncEvidence({ domitsPropertyId } = {}) {
  // Every result remembers its property, so a result is never shown for another property. Without
  // that, the render in which the selection changes would pair the previous property's item with
  // the new property, because the effect below only runs after that render.
  const [result, setResult] = useState({ propertyId: null, item: null, loadState: LATEST_SYNC_STATE.LOADING });

  useEffect(() => {
    if (!domitsPropertyId) return undefined;

    let cancelled = false;
    const settle = (item, loadState) => {
      if (!cancelled) setResult({ propertyId: domitsPropertyId, item, loadState });
    };

    settle(null, LATEST_SYNC_STATE.LOADING);
    getLatestSyncEvidence({ domitsPropertyId })
      .then((evidence) => settle(evidence?.item ?? null, LATEST_SYNC_STATE.LOADED))
      .catch((err) => {
        if (cancelled) return;
        if (isIntegrationNotFound(err)) {
          settle(null, LATEST_SYNC_STATE.UNAVAILABLE);
          return;
        }
        // The host sees a fixed sentence; the real detail goes to the console.
        console.error("Failed to load the last sync for the Distribution tab:", err);
        settle(null, LATEST_SYNC_STATE.ERROR);
      });
    return () => {
      cancelled = true;
    };
  }, [domitsPropertyId]);

  return useMemo(() => {
    if (!domitsPropertyId) return { item: null, loadState: LATEST_SYNC_STATE.IDLE };
    if (result.propertyId !== domitsPropertyId) return { item: null, loadState: LATEST_SYNC_STATE.LOADING };
    return { item: result.item, loadState: result.loadState };
  }, [domitsPropertyId, result]);
}
