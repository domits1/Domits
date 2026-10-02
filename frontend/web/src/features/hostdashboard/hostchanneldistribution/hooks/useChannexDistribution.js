import { useCallback, useEffect, useState } from "react";
import { getChannexStatus, getLatestSyncEvidence } from "../services/channexDistributionService";

export function useChannexDistribution({ userId, domitsPropertyId } = {}) {
  const [status, setStatus] = useState(null);
  const [syncEvidence, setSyncEvidence] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setErrorStatus(null);
    try {
      const [statusResult, syncResult] = await Promise.all([
        getChannexStatus({ userId }),
        getLatestSyncEvidence({ domitsPropertyId }),
      ]);
      setStatus(statusResult);
      setSyncEvidence(syncResult);
    } catch (err) {
      setError(err?.message || "Failed to load Channex distribution data.");
      // The view needs the HTTP status to tell the expected 403 (allowlist) from a real failure.
      setErrorStatus(err?.status ?? null);
    } finally {
      setLoading(false);
    }
  }, [userId, domitsPropertyId]);

  useEffect(() => {
    load();
  }, [load]);

  return { status, syncEvidence, loading, error, errorStatus, refresh: load };
}
