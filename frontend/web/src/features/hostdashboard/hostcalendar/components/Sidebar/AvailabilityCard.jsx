import React from "react";

export default function AvailabilityCard({ onBlock, onMaintenance, onUndo }) {

  const handleMaintenanceClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    alert('Maintenance button clicked! Check console...');
    console.log('🔧 Maintenance button clicked');
    console.log('onMaintenance function:', onMaintenance);
    console.log('Type:', typeof onMaintenance);

    if (typeof onMaintenance === 'function') {
      console.log('Calling onMaintenance...');
      onMaintenance();
    } else {
      console.error('❌ onMaintenance is not a function!');
      alert('ERROR: onMaintenance is not a function!');
    }
  };

  const handleBlockClick = () => {
    console.log('🚫 Block button clicked');
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
