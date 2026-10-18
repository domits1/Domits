import { useCallback, useEffect, useState } from "react";
import { getRemoteLockDevices } from "../services/remoteLockService";

// Devices exist only while the account is connected: it fetches on every switch to enabled, including the
// first render, and forgets the list when disabled. null means "not loaded", so a list is never shown stale.
export function useRemoteLockDevices(enabled) {
  const [devices, setDevices] = useState(null);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setDevices(null);
      setError(null);
      return undefined;
    }

    let cancelled = false;
    getRemoteLockDevices()
      .then((result) => {
        if (!cancelled) setDevices(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "Failed to load the RemoteLock devices.");
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, reloadKey]);

  const retry = useCallback(() => {
    setDevices(null);
    setError(null);
    setReloadKey((key) => key + 1);
  }, []);

  const loading = enabled && devices === null && error === null;

  return { devices: devices ?? [], loading, error, retry };
}
