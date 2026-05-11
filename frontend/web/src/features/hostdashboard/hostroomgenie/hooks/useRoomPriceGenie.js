import { useState, useEffect, useCallback } from "react";
import {
  connectRoomPriceGenie,
  disconnectRoomPriceGenie,
  getRoomPriceGenieStatus,
  sendInventory,
  pushAvailability,
  pushRates,
  updateSettings,
} from "../services/roompricegenieService";

export function useRoomPriceGenie() {
  const [integrations, setIntegrations] = useState([]);
  const [isLoading, setIsLoading]       = useState(false);
  const [isPushing, setIsPushing]       = useState(false);
  const [error, setError]               = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const clearMessages = () => { setError(null); setSuccessMessage(null); };

  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getRoomPriceGenieStatus();
      setIntegrations(data.integrations || []);
    } catch (err) {
      setError(err.message || "Could not fetch RoomPriceGenie status");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const connect = async (propertyId, rpgPropertyCode, clientId, clientSecret, options = {}) => {
    clearMessages();
    setIsLoading(true);
    try {
      await connectRoomPriceGenie(propertyId, rpgPropertyCode, clientId, clientSecret, options);
      setSuccessMessage("RoomPriceGenie successfully connected!");
      await fetchStatus();
    } catch (err) {
      setError(err.message || "Failed to connect RoomPriceGenie");
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = async (propertyId) => {
    clearMessages();
    setIsLoading(true);
    try {
      await disconnectRoomPriceGenie(propertyId);
      setSuccessMessage("RoomPriceGenie disconnected.");
      await fetchStatus();
    } catch (err) {
      setError(err.message || "Failed to disconnect");
    } finally {
      setIsLoading(false);
    }
  };

  const pushData = async (propertyId) => {
    clearMessages();
    setIsPushing(true);
    try {
      await pushAvailability(propertyId);
      await pushRates(propertyId);
      setSuccessMessage("Availability and rates pushed to RoomPriceGenie!");
      await fetchStatus();
    } catch (err) {
      setError(err.message || "Push failed");
    } finally {
      setIsPushing(false);
    }
  };

  const saveSettings = async (propertyId, settings) => {
    clearMessages();
    try {
      await updateSettings(propertyId, settings);
      setSuccessMessage("Settings saved.");
      await fetchStatus();
    } catch (err) {
      setError(err.message || "Failed to save settings");
    }
  };

  return {
    integrations,
    isLoading,
    isPushing,
    error,
    successMessage,
    connect,
    disconnect,
    pushData,
    saveSettings,
    refresh: fetchStatus,
  };
}
