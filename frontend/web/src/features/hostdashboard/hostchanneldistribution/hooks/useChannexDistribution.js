import { useCallback, useEffect, useState } from "react";
import { getChannexStatus, getLatestSyncEvidence } from "../services/channexDistributionService";

export function useChannexDistribution({ userId, domitsPropertyId } = {}) {
  const [status, setStatus] = useState(null);
  const [syncEvidence, setSyncEvidence] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusResult, syncResult] = await Promise.all([
        getChannexStatus({ userId }),
        getLatestSyncEvidence({ domitsPropertyId }),
      ]);
      setStatus(statusResult);
      setSyncEvidence(syncResult);
    } catch (err) {
      // Keep the raw error (not just its message) so callers can branch on err.status --
      // requestChannex in hostintegrations/channexApi.js attaches it for HTTP error responses,
      // and leaves it unset for a network failure.
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [userId, domitsPropertyId]);

  useEffect(() => {
    load();
  }, [load]);

  return { status, syncEvidence, loading, error, refresh: load };
}
