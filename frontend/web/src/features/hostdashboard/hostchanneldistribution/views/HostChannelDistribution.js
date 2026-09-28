import React from "react";
import useFetchUser from "../../../../hooks/useFetchUser";
import { useChannexDistribution } from "../hooks/useChannexDistribution";
import ChannexStatusCard from "../components/ChannexStatusCard";
import LastSyncCard from "../components/LastSyncCard";
import ComingSoonCard from "../components/ComingSoonCard";
import "../styles/HostChannelDistribution.css";

const COMING_SOON_CARDS = [
  { title: "Listing import", description: "Pull your existing channel listings into Domits." },
  { title: "Per-channel toggles", description: "Turn distribution on or off for each channel individually." },
  { title: "Sync health", description: "See sync history and errors across all your channels." },
];

function HostChannelDistribution() {
  const userId = useFetchUser();
  const { status, syncEvidence, loading } = useChannexDistribution({ userId });

  const isConnectedOrNeedsAttention = status && status.status !== "NOT_CONNECTED";

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

      {!loading && !isConnectedOrNeedsAttention && (
        <div className="host-chdist__empty">
          <p className="host-chdist__empty-text">No channel connected yet</p>
        </div>
      )}

      {isConnectedOrNeedsAttention && (
        <div className="chdist-card-list">
          <ChannexStatusCard status={status} />
          <LastSyncCard syncEvidence={syncEvidence} />
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
