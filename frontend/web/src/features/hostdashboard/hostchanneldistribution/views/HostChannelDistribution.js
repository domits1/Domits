import React, { useEffect, useState } from "react";
import useFetchUser from "../../../../hooks/useFetchUser";
import { useChannexDistribution } from "../hooks/useChannexDistribution";
import { useLatestSyncEvidence } from "../hooks/useLatestSyncEvidence";
import { MAPPED_PROPERTIES_STATE, useMappedProperties } from "../hooks/useMappedProperties";
import {
  MOCK_CONNECT_FLOW_ENABLED,
  MOCK_PREVIEW_SECTIONS_ENABLED,
  getPropertyMappingRows,
} from "../services/channexDistributionService";
import { MOCK_HOST_DISTRIBUTION_ENABLED } from "../services/hostDistributionApi";
import PlatformCardsSection from "../components/PlatformCardsSection";
import ChannexStatusCard from "../components/ChannexStatusCard";
import LastSyncCard from "../components/LastSyncCard";
import ComingSoonCard from "../components/ComingSoonCard";
import ConnectChannexModal from "../components/ConnectChannexModal";
import DisconnectChannexModal from "../components/DisconnectChannexModal";
import PropertyMappingTable from "../components/PropertyMappingTable";
import "../styles/HostChannelDistribution.css";

const COMING_SOON_CARDS = [
  { title: "Room & rate mapping", description: "Map your Domits rooms and rates to each channel's rooms and rates." },
  { title: "Per-channel toggles", description: "Turn distribution on or off for each channel individually." },
  { title: "Sync health", description: "See sync history and errors across all your channels." },
];

const FORBIDDEN_STATUS = 403;
const LOAD_ERROR_MESSAGE = "Something went wrong loading your Channex connection.";
const PROPERTIES_LOADING_MESSAGE = "Loading your properties…";
const NO_LINKED_PROPERTIES_MESSAGE = "No properties are linked to Channex yet.";
const PROPERTIES_ERROR_MESSAGE = "We couldn't load your properties.";

// Mirrors the set in components/ChannexStatusCard.js -- kept as a separate local copy rather
// than a shared export so this feature doesn't gain a cross-file refactor as a side effect.
const RECONNECT_BUCKET_STATUSES = new Set(["RECONNECT_REQUIRED", "VALIDATION_FAILED", "DISCONNECTED"]);

function HostChannelDistribution() {
  const userId = useFetchUser();
  const [pickedPropertyId, setPickedPropertyId] = useState("");

  // The picker below needs the status first, so the status hook knows nothing about properties.
  const { status, loading, error, errorStatus, reload } = useChannexDistribution();
  const [activeModal, setActiveModal] = useState(null);
  const [propertyMappings, setPropertyMappings] = useState([]);

  // 403 means the host is outside the Channex allowlist: expected, so it gets the empty state.
  const isOutsideAllowlist = errorStatus === FORBIDDEN_STATUS;
  // With the host distribution preview on, the platform cards replace everything account-level: a
  // host provisioned by the backend has no account row to be "connected" to before the first switch.
  const showAccountLevel = !MOCK_HOST_DISTRIBUTION_ENABLED;
  const hasBlockingError = showAccountLevel && Boolean(error) && !isOutsideAllowlist;
  const isConnectedOrNeedsAttention = showAccountLevel && Boolean(status) && status.status !== "NOT_CONNECTED";

  // Real data. Not requested at all until Channex is connected or needs attention.
  const { options: propertyOptions, loadState: propertiesLoadState } = useMappedProperties({
    enabled: isConnectedOrNeedsAttention,
  });
  // Defaults to the first mapped listing, and falls back to it if the picked one disappears.
  const hasPickedProperty = propertyOptions.some((option) => option.value === pickedPropertyId);
  const selectedPropertyId = hasPickedProperty ? pickedPropertyId : (propertyOptions[0]?.value ?? "");
  const selectedPropertyName = propertyOptions.find((option) => option.value === selectedPropertyId)?.label ?? "";
  // Real data, requested only once a property is selected.
  const { item: latestSyncItem, loadState: latestSyncLoadState } = useLatestSyncEvidence({
    domitsPropertyId: selectedPropertyId,
  });
  const isLoadingProperties = propertiesLoadState === MAPPED_PROPERTIES_STATE.LOADING;
  const hasPropertyLoadError = propertiesLoadState === MAPPED_PROPERTIES_STATE.ERROR;
  // The unavailable state (HTTP 409) deliberately shows nothing: the status card already explains it.
  const hasNoLinkedProperties = propertiesLoadState === MAPPED_PROPERTIES_STATE.LOADED && propertyOptions.length === 0;

  const showEmptyState = showAccountLevel && !loading && !hasBlockingError && !isConnectedOrNeedsAttention;
  const canAddChannel = MOCK_CONNECT_FLOW_ENABLED && !loading && status?.status === "NOT_CONNECTED";
  const showPropertyPicker = isConnectedOrNeedsAttention && propertyOptions.length > 1;
  // Without a property nothing is queried, so "No sync yet" would claim something we never checked.
  // The card hides itself when the integration is not found (HTTP 404): the status card explains it.
  const showLastSync = isConnectedOrNeedsAttention && Boolean(selectedPropertyId);
  // Narrower than isConnectedOrNeedsAttention: excludes PENDING_PROVIDER_VALIDATION, since
  // there's nothing confirmed to map against mid-validation.
  const showPropertyMapping =
    MOCK_PREVIEW_SECTIONS_ENABLED &&
    !loading &&
    !error &&
    (status?.status === "CONNECTED" || RECONNECT_BUCKET_STATUSES.has(status?.status));

  // The host sees a fixed message; the real detail (method, endpoint, backend message) goes to the console.
  useEffect(() => {
    if (hasBlockingError) {
      console.error("Failed to load the Distribution tab:", error);
    }
  }, [hasBlockingError, error]);

  useEffect(() => {
    if (!showPropertyMapping) return undefined;
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

      {MOCK_HOST_DISTRIBUTION_ENABLED && <PlatformCardsSection />}

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
          {isLoadingProperties && (
            <output className="host-chdist__empty-text">{PROPERTIES_LOADING_MESSAGE}</output>
          )}
          {hasNoLinkedProperties && (
            <output className="host-chdist__empty-text">{NO_LINKED_PROPERTIES_MESSAGE}</output>
          )}
          {hasPropertyLoadError && (
            <p className="host-chdist__error-text" role="alert">
              {PROPERTIES_ERROR_MESSAGE}
            </p>
          )}
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
          {showLastSync && (
            <LastSyncCard propertyName={selectedPropertyName} loadState={latestSyncLoadState} item={latestSyncItem} />
          )}
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
