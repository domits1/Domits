import { useCallback, useEffect, useState } from "react";
import { getChannexStatus } from "../services/channexDistributionService";

const toFailure = (err, fallbackMessage) => ({
  message: err?.message || fallbackMessage,
  status: err?.status ?? null,
});

export function useChannexDistribution() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFailure, setStatusFailure] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Status is account-level. It does not depend on a user id either: the backend identifies the
  // user from the token, and a dependency on the id (which useFetchUser resolves late) would fire
  // a second request once it arrives.
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

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return {
    status,
    loading,
    error: statusFailure?.message ?? null,
    errorStatus: statusFailure?.status ?? null,
    reload,
  };
}
