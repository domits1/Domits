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
  // Numbers the refreshes, so an answer can tell whether it is still the latest one.
  const latestRefreshRef = useRef(0);

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

  // Replaces the one listing an answer carries, with no merge: the answer is the whole listing.
  const applyListing = useCallback((propertyId, listing) => {
    setResult((previous) => ({
      ...previous,
      listings: previous.listings.map((candidate) => (candidate.propertyId === propertyId ? listing : candidate)),
    }));
  }, []);

  // Reads the listings again without the loading state, for an answer that says the listing may have
  // changed. A failed read keeps what the host sees and only reaches the console.
  const rereadListings = useCallback(async () => {
    try {
      const { listings } = await getHostListings();
      if (!Array.isArray(listings)) throw new Error("The listings answer did not contain a list.");
      if (!mountedRef.current) return;
      setResult({ listings, loadState: HOST_DISTRIBUTION_STATE.LOADED });
    } catch (err) {
      console.error("Failed to read the host listings again:", err);
    }
  }, []);

  // Only the latest refresh owns the Refreshing… state and the failure message. An older one that
  // answers late (the host moved to another listing and refreshed that one) still updates its own
  // listing, but must not clear the newer one's state: that would allow a second request for it.
  const refresh = useCallback(async (propertyId) => {
    const refreshNumber = ++latestRefreshRef.current;
    const isLatest = () => mountedRef.current && latestRefreshRef.current === refreshNumber;
    setRefreshingPropertyId(propertyId);
    setRefreshFailedPropertyId(null);
    try {
      const { listing } = await refreshChannels({ propertyId });
      // An answer without a listing, or for another listing, must not replace this card or any other.
      if (listing?.propertyId !== propertyId) throw new Error("The refresh response did not contain this listing.");
      if (!mountedRef.current) return;
      applyListing(propertyId, listing);
    } catch (err) {
      console.error("Failed to refresh the channels of a listing:", err);
      if (isLatest()) setRefreshFailedPropertyId(propertyId);
    } finally {
      if (isLatest()) setRefreshingPropertyId(null);
    }
  }, [applyListing]);

  return {
    listings: result.listings,
    loadState: result.loadState,
    reload,
    rereadListings,
    refresh,
    refreshingPropertyId,
    refreshFailedPropertyId,
  };
}
