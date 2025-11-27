import React from "react";

export default function AvailabilityCard({ onBlock, onMaintenance, onUndo }) {

  const handleMaintenanceClick = () => {
    if (typeof onMaintenance === 'function') {
      onMaintenance();
    }
  };

  const handleBlockClick = () => {
    if (typeof onBlock === 'function') {
      onBlock();
    }
  };

  return (
    <div className="hc-card">
      <div className="hc-card-title">Availability</div>
      <div className="hc-card-actions">
        <button className="hc-btn" onClick={handleBlockClick}>
          <span className="hc-plus">+</span> Block dates
        </button>
        <button
          className="hc-btn ghost"
          onClick={handleMaintenanceClick}
          type="button"
        >
          Maintenance
        </button>
      </div>
      <button className="hc-link" onClick={onUndo} type="button">
        ↩ Undo
      </button>
    </div>
  );
}
