import React from "react";
import "../styles/HostPriceLabs.css";

function formatDate(ms) {
  if (!ms) return "Never";
  return new Date(Number(ms)).toLocaleString("nl-NL");
}

function StatusBadge({ status }) {
  const map = {
    connected:    { label: "Connected",    cls: "badge--success" },
    synced:       { label: "Synced",       cls: "badge--success" },
    error:        { label: "Error",        cls: "badge--error"   },
    disconnected: { label: "Disconnected", cls: "badge--error"   },
  };
  const { label, cls } = map[status] || { label: status || "—", cls: "" };
  return <span className={`pl-badge ${cls}`}>{label}</span>;
}

function PriceLabsStatusCard({ status, onSync, onDisconnect, isSyncing, isLoading }) {
  return (
    <div className="pl-card">
      <div className="pl-card__header">
        <div>
          <h3 className="pl-card__title">PriceLabs</h3>
          <p className="pl-card__subtitle">{status.pricelabs_email}</p>
        </div>
        <StatusBadge status={status.last_sync_status} />
      </div>

      <div className="pl-card__stats">
        <div className="pl-card__stat">
          <span className="pl-card__stat-label">Listings synced</span>
          <span className="pl-card__stat-value">{formatDate(status.last_listings_sync_at)}</span>
        </div>
        <div className="pl-card__stat">
          <span className="pl-card__stat-label">Calendar synced</span>
          <span className="pl-card__stat-value">{formatDate(status.last_calendar_sync_at)}</span>
        </div>
        <div className="pl-card__stat">
          <span className="pl-card__stat-label">Reservations synced</span>
          <span className="pl-card__stat-value">{formatDate(status.last_reservations_sync_at)}</span>
        </div>
      </div>

      {status.last_sync_error && (
        <div className="pl-alert pl-alert--error">{status.last_sync_error}</div>
      )}

      <div className="pl-card__actions">
        <button
          className="pl-btn pl-btn--primary"
          onClick={onSync}
          disabled={isSyncing || isLoading}
        >
          {isSyncing ? "Syncing…" : "Sync all data to PriceLabs"}
        </button>
        <button
          className="pl-btn pl-btn--danger"
          onClick={onDisconnect}
          disabled={isLoading || isSyncing}
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}

export default PriceLabsStatusCard;
