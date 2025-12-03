import React from "react";

export default function StatsPanel({ selections }) {
  const counts = {
    booked: selections.booked.size,
    blocked: selections.blocked.size,
    maintenance: selections.maintenance.size,
    available:
      selections.available.size ||
      Math.max(0, 0), // placeholder when nothing selected
  };

  return (
    <div className="hc-stats">
      <div className="hc-stats-title">Availability → Bookings (last 8 weeks)</div>
      <div className="hc-stats-cards">
        {Object.entries(counts).map(([k, v]) => (
          <div key={k} className={`hc-stats-card ${k}`}>
            <div className="hc-stats-label">{k}</div>
            <div className="hc-stats-value">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}