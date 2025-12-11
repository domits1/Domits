import React from "react";

export default function AvailabilityCard({ onBlock, onMaintenance, onUndo }) {
  return (
    <div className="hc-card">
      <div className="hc-card-title">Availability</div>
      <div className="hc-card-actions">
        <button className="hc-btn" onClick={onBlock}>
          <span className="hc-plus">+</span> Block dates
        </button>
        <button className="hc-btn ghost" onClick={onMaintenance}>
          Maintenance
        </button>
      </div>
      <button className="hc-link" onClick={onUndo}>
        ↩ Undo
      </button>
    </div>
  );
}
