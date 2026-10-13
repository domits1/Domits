import { useCallback, useEffect, useState } from "react";
import { getRemoteLockStatus } from "../services/remoteLockService";

export function useRemoteLock() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getRemoteLockStatus()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "Failed to load the RemoteLock status.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return { status: data?.status ?? null, lastSyncAt: data?.lastSyncAt ?? null, loading, error, reload };
}
