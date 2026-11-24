import { useCallback, useEffect, useRef, useState } from "react";
import { getHostListings, refreshChannels } from "../services/hostDistributionApi";

export const HOST_DISTRIBUTION_STATE = {
  LOADING: "loading",
  LOADED: "loaded",
  ERROR: "error",
};

// Loads the host's listings once, and refreshes one listing's channels on request. The requests
// carry no user id: the backend identifies the host from the token.
export function useHostDistribution() {
  const [result, setResult] = useState({ listings: [], loadState: HOST_DISTRIBUTION_STATE.LOADING });
  const [reloadKey, setReloadKey] = useState(0);
  const [refreshingPropertyId, setRefreshingPropertyId] = useState(null);
  // Which listing the last refresh failed for, so the message does not follow the host to another one.
  const [refreshFailedPropertyId, setRefreshFailedPropertyId] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setResult({ listings: [], loadState: HOST_DISTRIBUTION_STATE.LOADING });
    getHostListings()
      .then(({ listings }) => {
        if (!cancelled) {
          setResult({ listings: Array.isArray(listings) ? listings : [], loadState: HOST_DISTRIBUTION_STATE.LOADED });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        // The host sees a fixed sentence; the real detail goes to the console.
        console.error("Failed to load the host's listings for the Distribution tab:", err);
        setResult({ listings: [], loadState: HOST_DISTRIBUTION_STATE.ERROR });
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  // The refresh answers with channels only, so they are merged into the listing: its status and
  // missing items come from the listings read and must not be overwritten.
  const applyChannels = useCallback((propertyId, channels) => {
    setResult((previous) => ({
      ...previous,
      listings: previous.listings.map((candidate) =>
        candidate.propertyId === propertyId ? { ...candidate, channels } : candidate
      ),
    }));
  }, []);

  const refresh = useCallback(async (propertyId) => {
    setRefreshingPropertyId(propertyId);
    setRefreshFailedPropertyId(null);
    try {
      const { channels } = await refreshChannels({ propertyId });
      // A body without channels must not replace them with nothing.
      if (!Array.isArray(channels)) throw new Error("The refresh response did not contain channels.");
      if (!mountedRef.current) return;
      applyChannels(propertyId, channels);
    } catch (err) {
      console.error("Failed to refresh the channels of a listing:", err);
      if (mountedRef.current) setRefreshFailedPropertyId(propertyId);
    } finally {
      if (mountedRef.current) setRefreshingPropertyId(null);
    }
  }, [applyChannels]);

  return {
    listings: result.listings,
    loadState: result.loadState,
    reload,
    refresh,
    refreshingPropertyId,
    refreshFailedPropertyId,
  };
}
