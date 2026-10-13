import React, { useEffect, useState } from "react";
import useFetchUser from "../../../../hooks/useFetchUser";
import { useChannexDistribution } from "../hooks/useChannexDistribution";
import { useMappedProperties } from "../hooks/useMappedProperties";
import { MOCK_CONNECT_FLOW_ENABLED } from "../services/channexDistributionService";
import ChannexStatusCard from "../components/ChannexStatusCard";
import LastSyncCard from "../components/LastSyncCard";
import ComingSoonCard from "../components/ComingSoonCard";
import ConnectChannexModal from "../components/ConnectChannexModal";
import DisconnectChannexModal from "../components/DisconnectChannexModal";
import "../styles/HostChannelDistribution.css";

const COMING_SOON_CARDS = [
  { title: "Room & rate mapping", description: "Map your Domits rooms and rates to each channel's rooms and rates." },
  { title: "Per-channel toggles", description: "Turn distribution on or off for each channel individually." },
  { title: "Sync health", description: "See sync history and errors across all your channels." },
];

const FORBIDDEN_STATUS = 403;
const LOAD_ERROR_MESSAGE = "Something went wrong loading your Channex connection.";

function HostChannelDistribution() {
  const userId = useFetchUser();
  const propertyOptions = useMappedProperties({ userId });
  const [pickedPropertyId, setPickedPropertyId] = useState("");

  // Defaults to the first mapped listing, and falls back to it if the picked one disappears.
  const hasPickedProperty = propertyOptions.some((option) => option.value === pickedPropertyId);
  const selectedPropertyId = hasPickedProperty ? pickedPropertyId : (propertyOptions[0]?.value ?? "");

  const { status, syncEvidence, loading, error, errorStatus, reload } = useChannexDistribution({
    domitsPropertyId: selectedPropertyId,
  });
  const [activeModal, setActiveModal] = useState(null);

  // 403 means the host is outside the Channex allowlist: expected, so it gets the empty state.
  const isOutsideAllowlist = errorStatus === FORBIDDEN_STATUS;
  const hasBlockingError = Boolean(error) && !isOutsideAllowlist;
  const isConnectedOrNeedsAttention = status && status.status !== "NOT_CONNECTED";
  const showEmptyState = !loading && !hasBlockingError && !isConnectedOrNeedsAttention;
  const canAddChannel = MOCK_CONNECT_FLOW_ENABLED && !loading && status?.status === "NOT_CONNECTED";
  const showPropertyPicker = isConnectedOrNeedsAttention && propertyOptions.length > 1;
  // Without a property nothing was queried, so "No sync yet" would claim something we never checked.
  const showLastSync = isConnectedOrNeedsAttention && Boolean(selectedPropertyId);

  // The host sees a fixed message; the real detail (method, endpoint, backend message) goes to the console.
  useEffect(() => {
    if (hasBlockingError) {
      console.error("Failed to load the Distribution tab:", error);
    }
  }, [hasBlockingError, error]);

  const closeModal = () => setActiveModal(null);

  const handleConnected = () => {
    closeModal();
    reload();
  };

  const handleDisconnected = () => {
    closeModal();
    reload();
  };

  return (
    <div className="host-chdist">
      <div className="host-chdist__header">
        <div className="host-chdist__heading">
          <h2 className="host-chdist__title">Connected channels</h2>
          <p className="host-chdist__description">
            Connect your channel manager to distribute availability, prices and bookings
          </p>
        </div>
        <button
          className="chdist-btn chdist-btn--primary"
          disabled={!canAddChannel}
          onClick={() => setActiveModal("add")}
        >
          + Add channel
        </button>
      </div>

      {hasBlockingError && (
        <div className="host-chdist__error" role="alert">
          <p className="host-chdist__error-text">{LOAD_ERROR_MESSAGE}</p>
          <button className="chdist-btn chdist-btn--primary" onClick={reload}>
            Retry
          </button>
        </div>
      )}

      {showEmptyState && (
        <div className="host-chdist__empty">
          <p className="host-chdist__empty-text">No channel connected yet</p>
        </div>
      )}

      {isConnectedOrNeedsAttention && (
        <div className="chdist-card-list">
          <ChannexStatusCard
            status={status}
            onReconnectClick={() => setActiveModal("reconnect")}
            onDisconnectClick={() => setActiveModal("disconnect")}
            manageEnabled={MOCK_CONNECT_FLOW_ENABLED}
          />
          {showPropertyPicker && (
            <label className="host-chdist__picker">
              <span className="host-chdist__picker-label">Property</span>
              <select
                className="host-chdist__picker-select"
                value={selectedPropertyId}
                onChange={(event) => setPickedPropertyId(event.target.value)}>
                {propertyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {showLastSync && <LastSyncCard syncEvidence={syncEvidence} />}
        </div>
      )}

      <div className="chdist-card-list">
        {COMING_SOON_CARDS.map((card) => (
          <ComingSoonCard key={card.title} title={card.title} description={card.description} />
        ))}
      </div>

      {(activeModal === "add" || activeModal === "reconnect") && (
        <ConnectChannexModal
          variant={activeModal}
          userId={userId}
          onClose={closeModal}
          onConnected={handleConnected}
        />
      )}

      {activeModal === "disconnect" && (
        <DisconnectChannexModal userId={userId} onClose={closeModal} onDisconnected={handleDisconnected} />
      )}
    </div>
  );
}

export default HostChannelDistribution;
