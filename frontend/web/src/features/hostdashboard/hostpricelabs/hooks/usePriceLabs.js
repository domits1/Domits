import { useState, useEffect, useCallback } from "react";
import {
  connectPriceLabs,
  disconnectPriceLabs,
  getPriceLabsStatus,
  pushPriceLabsListings,
  pushPriceLabsCalendar,
  pushPriceLabsReservations,
} from "../services/priceLabsService";

export function usePriceLabs() {
  const [status,         setStatus]         = useState(null);
  const [isLoading,      setIsLoading]      = useState(false);
  const [isSyncing,      setIsSyncing]      = useState(false);
  const [error,          setError]          = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const clear = () => { setError(null); setSuccessMessage(null); };

  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getPriceLabsStatus();
      setStatus(data);
    } catch (err) {
      setError(err.message || "Could not fetch PriceLabs status");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const connect = async (priceLabsEmail) => {
    clear(); setIsLoading(true);
    try {
      await connectPriceLabs(priceLabsEmail);
      setSuccessMessage("PriceLabs connected successfully!");
      await fetchStatus();
      return true;
    } catch (err) {
      setError(err.message || "Failed to connect PriceLabs");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = async () => {
    clear(); setIsLoading(true);
    try {
      await disconnectPriceLabs();
      setSuccessMessage("PriceLabs disconnected.");
      await fetchStatus();
    } catch (err) {
      setError(err.message || "Failed to disconnect");
    } finally {
      setIsLoading(false);
    }
  };

  const syncAll = async () => {
    clear(); setIsSyncing(true);
    try {
      await pushPriceLabsListings();
      await pushPriceLabsCalendar();
      await pushPriceLabsReservations();
      setSuccessMessage("Listings, calendar and reservations synced to PriceLabs!");
      await fetchStatus();
    } catch (err) {
      setError(err.message || "Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    status,
    isLoading,
    isSyncing,
    error,
    successMessage,
    connect,
    disconnect,
    syncAll,
    refresh: fetchStatus,
  };
}
