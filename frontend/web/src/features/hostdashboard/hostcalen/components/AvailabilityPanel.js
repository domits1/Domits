import React from "react";
export default function AvailabilityPanel({ onBlockRangeMode, onMaintenance, onUndo }) {
  return (
    <div className="hc-card">
      <div className="hc-card-title">Availability</div>
      <div className="hc-card-actions">
        <button className="hc-btn" onClick={onBlockRangeMode}>
          + Block dates
        </button>
        <button className="hc-btn" onClick={onMaintenance}>
          Maintenance
        </button>
      </div>
      <div className="hc-card-footer">
        <button className="hc-link" onClick={onUndo}>
          ↩ Undo
        </button>
      </div>
    </div>
  );
}
