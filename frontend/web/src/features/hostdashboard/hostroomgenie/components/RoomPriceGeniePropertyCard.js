import React from "react";
import "../styles/HostRoomPriceGenie.css";

function formatDate(ms) {
  if (!ms) return "Never";
  return new Date(Number(ms)).toLocaleString("nl-NL");
}

function StatusBadge({ status }) {
  const map = {
    success:              { label: "Synced",       cls: "badge--success" },
    connected:            { label: "Connected",    cls: "badge--success" },
    availability_pushed:  { label: "Avail. sent",  cls: "badge--info" },
    rates_pushed:         { label: "Rates sent",   cls: "badge--info" },
    no_data:              { label: "No data",      cls: "badge--warning" },
    disconnected:         { label: "Disconnected", cls: "badge--error" },
    error:                { label: "Error",        cls: "badge--error" },
  };
  const { label, cls } = map[status] || { label: status || "—", cls: "" };
  return <span className={`rpg-badge ${cls}`}>{label}</span>;
}

function RoomPriceGeniePropertyCard({
  integration,
  onPush,
  onDisconnect,
  isPushing,
  isLoading,
}) {
  return (
    <div className="rpg-card">
      <div className="rpg-card__header">
        <div>
          <h3 className="rpg-card__title">{integration.property_id}</h3>
          <p className="rpg-card__subtitle">RPG code: {integration.rpg_property_code}</p>
        </div>
        <StatusBadge status={integration.last_sync_status} />
      </div>

      <div className="rpg-card__stats">
        <div className="rpg-card__stat">
          <span className="rpg-card__stat-label">Sync mode</span>
          <span className="rpg-card__stat-value">{integration.sync_mode}</span>
        </div>
        <div className="rpg-card__stat">
          <span className="rpg-card__stat-label">Min price</span>
          <span className="rpg-card__stat-value">
            {integration.min_price ? `€${integration.min_price}` : "—"}
          </span>
        </div>
        <div className="rpg-card__stat">
          <span className="rpg-card__stat-label">Max price</span>
          <span className="rpg-card__stat-value">
            {integration.max_price ? `€${integration.max_price}` : "—"}
          </span>
        </div>
        <div className="rpg-card__stat">
          <span className="rpg-card__stat-label">Last synced</span>
          <span className="rpg-card__stat-value">{formatDate(integration.last_sync_at)}</span>
        </div>
      </div>

      {integration.last_sync_error && (
        <div className="rpg-alert rpg-alert--error rpg-card__error">
          {integration.last_sync_error}
        </div>
      )}

      <div className="rpg-card__actions">
        <button
          className="rpg-btn rpg-btn--primary"
          onClick={() => onPush(integration.property_id)}
          disabled={isPushing || isLoading}
        >
          {isPushing ? "Pushing…" : "Push data to RPG"}
        </button>
        <button
          className="rpg-btn rpg-btn--danger"
          onClick={() => onDisconnect(integration.property_id)}
          disabled={isLoading || isPushing}
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}

export default RoomPriceGeniePropertyCard;
