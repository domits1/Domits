import React, { useEffect, useState } from "react";
import useFetchUser from "../../../../hooks/useFetchUser";
import { useChannexDistribution } from "../hooks/useChannexDistribution";
import { useMappedProperties } from "../hooks/useMappedProperties";
import ChannexStatusCard from "../components/ChannexStatusCard";
import LastSyncCard from "../components/LastSyncCard";
import ComingSoonCard from "../components/ComingSoonCard";
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
    userId,
    domitsPropertyId: selectedPropertyId,
  });

  // 403 means the host is outside the Channex allowlist: expected, so it gets the empty state.
  const isOutsideAllowlist = errorStatus === FORBIDDEN_STATUS;
  const hasBlockingError = Boolean(error) && !isOutsideAllowlist;
  const isConnectedOrNeedsAttention = status && status.status !== "NOT_CONNECTED";
  const showEmptyState = !loading && !hasBlockingError && !isConnectedOrNeedsAttention;
  const showPropertyPicker = isConnectedOrNeedsAttention && propertyOptions.length > 1;
  // Without a property nothing was queried, so "No sync yet" would claim something we never checked.
  const showLastSync = isConnectedOrNeedsAttention && Boolean(selectedPropertyId);

  // The host sees a fixed message; the real detail (method, endpoint, backend message) goes to the console.
  useEffect(() => {
    if (hasBlockingError) {
      console.error("Failed to load the Distribution tab:", error);
    }
  }, [hasBlockingError, error]);

  return (
    <div className="host-chdist">
      <div className="host-chdist__header">
        <div className="host-chdist__heading">
          <h2 className="host-chdist__title">Connected channels</h2>
          <p className="host-chdist__description">
            Connect your channel manager to distribute availability, prices and bookings
          </p>
        </div>
        <button className="chdist-btn chdist-btn--primary" disabled>
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
          <ChannexStatusCard status={status} />
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
    </div>
  );
}

export default HostChannelDistribution;
