import { useEffect, useMemo, useState } from "react";
import { getMappedProperties } from "../services/channexDistributionService";

const toOption = (listing) => {
  const id = String(listing?.property?.id || "").trim();
  if (!id) return null;
  return { value: id, label: listing?.property?.title || id };
};

export function useMappedProperties({ userId } = {}) {
  const [listings, setListings] = useState([]);

  useEffect(() => {
    let cancelled = false;
    getMappedProperties({ userId })
      .then((result) => {
        if (!cancelled) setListings(Array.isArray(result) ? result : []);
      })
      .catch((err) => {
        // The picker is a convenience: without a list the view shows no picker instead of an error
        // block, which would be confusing next to the main status error. Logged for debugging only.
        console.error("Failed to load mapped properties for the Distribution tab:", err);
        if (!cancelled) setListings([]);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return useMemo(() => listings.map(toOption).filter(Boolean), [listings]);
}
