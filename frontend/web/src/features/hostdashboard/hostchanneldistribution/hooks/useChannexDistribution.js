import { useCallback, useEffect, useState } from "react";
import { getChannexStatus, getLatestSyncEvidence } from "../services/channexDistributionService";

const toFailure = (err, fallbackMessage) => ({
  message: err?.message || fallbackMessage,
  status: err?.status ?? null,
});

export function useChannexDistribution({ domitsPropertyId } = {}) {
  const [status, setStatus] = useState(null);
  const [syncEvidence, setSyncEvidence] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFailure, setStatusFailure] = useState(null);
  const [syncFailure, setSyncFailure] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Status is account-level, so switching property must not refetch it. It does not depend on a
  // user id either: the backend identifies the user from the token, and a dependency on the id
  // (which useFetchUser resolves late) would fire a second request once it arrives.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setStatusFailure(null);
    getChannexStatus()
      .then((result) => {
        if (!cancelled) setStatus(result);
      })
      .catch((err) => {
        if (!cancelled) setStatusFailure(toFailure(err, "Failed to load Channex distribution data."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // The real endpoint answers 400 without a property, so nothing is fetched until one is selected.
  useEffect(() => {
    setSyncFailure(null);
    setSyncEvidence(null);
    if (!domitsPropertyId) return undefined;

    let cancelled = false;
    getLatestSyncEvidence({ domitsPropertyId })
      .then((result) => {
        if (!cancelled) setSyncEvidence(result);
      })
      .catch((err) => {
        if (!cancelled) setSyncFailure(toFailure(err, "Failed to load the latest sync."));
      });
    return () => {
      cancelled = true;
    };
  }, [domitsPropertyId, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const failure = statusFailure || syncFailure;

  return {
    status,
    syncEvidence,
    loading,
    error: failure?.message ?? null,
    errorStatus: failure?.status ?? null,
    reload,
  };
}
