import React, { useEffect, useState } from "react";
import { useChannexDistribution } from "../hooks/useChannexDistribution";
import { MOCK_CONNECT_FLOW_ENABLED, getPropertyMappingRows } from "../services/channexDistributionService";
import ChannexStatusCard from "../components/ChannexStatusCard";
import LastSyncCard from "../components/LastSyncCard";
import ComingSoonCard from "../components/ComingSoonCard";
import ConnectChannexModal from "../components/ConnectChannexModal";
import DisconnectChannexModal from "../components/DisconnectChannexModal";
import PropertyMappingTable from "../components/PropertyMappingTable";
import "../styles/HostChannelDistribution.css";

const COMING_SOON_CARDS = [
  { title: "Listing import", description: "Pull your existing channel listings into Domits." },
  { title: "Per-channel toggles", description: "Turn distribution on or off for each channel individually." },
  { title: "Sync health", description: "See sync history and errors across all your channels." },
];

// Mirrors the set in components/ChannexStatusCard.js -- kept as a separate local copy rather
// than a shared export so this feature doesn't gain a cross-file refactor as a side effect.
const RECONNECT_BUCKET_STATUSES = new Set(["RECONNECT_REQUIRED", "VALIDATION_FAILED", "DISCONNECTED"]);

function HostChannelDistribution() {
  // No userId here: the backend takes the user from the Cognito ID token on every request
  // (hostintegrations/channexApi.js), not from a client-supplied value.
  const { status, syncEvidence, loading, error, refresh } = useChannexDistribution();
  const [activeModal, setActiveModal] = useState(null);
  const [propertyMappings, setPropertyMappings] = useState([]);

  const isForbidden = !loading && error?.status === 403;
  const isOtherError = !loading && !!error && !isForbidden;
  const isConnectedOrNeedsAttention = !loading && !error && status && status.status !== "NOT_CONNECTED";
  const isEmpty = !loading && !error && status && status.status === "NOT_CONNECTED";
  const canAddChannel = MOCK_CONNECT_FLOW_ENABLED && !loading && !error && status?.status === "NOT_CONNECTED";
  // Narrower than isConnectedOrNeedsAttention: excludes PENDING_PROVIDER_VALIDATION, since
  // there's nothing confirmed to map against mid-validation.
  const showPropertyMapping =
    !loading &&
    !error &&
    (status?.status === "CONNECTED" || RECONNECT_BUCKET_STATUSES.has(status?.status));

  useEffect(() => {
    if (!showPropertyMapping) return;
    let mounted = true;

    getPropertyMappingRows().then((rows) => {
      if (mounted) setPropertyMappings(rows);
    });

    return () => {
      mounted = false;
    };
  }, [showPropertyMapping]);

  const closeModal = () => setActiveModal(null);

  const handleConnected = () => {
    closeModal();
    refresh();
  };

  const handleDisconnected = () => {
    closeModal();
    refresh();
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

      {isForbidden && (
        <div className="host-chdist__notice">
          <p className="host-chdist__notice-text">Channel distribution isn't available for your account yet.</p>
        </div>
      )}

      {isOtherError && (
        <div className="host-chdist__notice">
          <p className="host-chdist__notice-text">Something went wrong loading your Channex connection.</p>
          <button type="button" className="chdist-btn chdist-btn--secondary" onClick={refresh}>
            Retry
          </button>
        </div>
      )}

      {isEmpty && (
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
          <LastSyncCard syncEvidence={syncEvidence} />
        </div>
      )}

      <div className="chdist-card-list">
        {COMING_SOON_CARDS.map((card) => (
          <ComingSoonCard key={card.title} title={card.title} description={card.description} />
        ))}
      </div>

      {showPropertyMapping && (
        <div className="chdist-property-section">
          <h3 className="chdist-section-title">Property mapping</h3>
          <PropertyMappingTable properties={propertyMappings} />
        </div>
      )}

      {(activeModal === "add" || activeModal === "reconnect") && (
        <ConnectChannexModal variant={activeModal} onClose={closeModal} onConnected={handleConnected} />
      )}

      {activeModal === "disconnect" && (
        <DisconnectChannexModal onClose={closeModal} onDisconnected={handleDisconnected} />
      )}
    </div>
  );
}

export default HostChannelDistribution;
