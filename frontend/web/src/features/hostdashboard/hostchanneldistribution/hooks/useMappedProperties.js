import { useEffect, useMemo, useState } from "react";
import { getMappedProperties } from "../services/channexDistributionService";

export const MAPPED_PROPERTIES_STATE = {
  IDLE: "idle",
  LOADING: "loading",
  LOADED: "loaded",
  // Channex is not connected or needs a reconnect (HTTP 409): the status card already explains it.
  UNAVAILABLE: "unavailable",
  ERROR: "error",
};

const HTTP_CONFLICT = 409;

const toOption = (listing) => {
  const id = String(listing?.property?.id || "").trim();
  if (!id) return null;
  return { value: id, label: listing?.property?.title || id };
};

// `enabled: false` makes the hook inert: no request, no options, state IDLE. The view enables it
// only once Channex is connected, so a host without a connection triggers no request at all.
// The request carries no user id: the backend identifies the user from the token.
export function useMappedProperties({ enabled = true } = {}) {
  const [result, setResult] = useState({ listings: [], loadState: MAPPED_PROPERTIES_STATE.LOADING });

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;
    setResult({ listings: [], loadState: MAPPED_PROPERTIES_STATE.LOADING });
    getMappedProperties()
      .then((listings) => {
        if (!cancelled) {
          setResult({
            listings: Array.isArray(listings) ? listings : [],
            loadState: MAPPED_PROPERTIES_STATE.LOADED,
          });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.status === HTTP_CONFLICT) {
          setResult({ listings: [], loadState: MAPPED_PROPERTIES_STATE.UNAVAILABLE });
          return;
        }
        // The host sees a fixed sentence; the real detail goes to the console.
        console.error("Failed to load the properties for the Distribution tab:", err);
        setResult({ listings: [], loadState: MAPPED_PROPERTIES_STATE.ERROR });
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return useMemo(
    () =>
      enabled
        ? { options: result.listings.map(toOption).filter(Boolean), loadState: result.loadState }
        : { options: [], loadState: MAPPED_PROPERTIES_STATE.IDLE },
    [enabled, result]
  );
}
