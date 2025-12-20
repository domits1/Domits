import React from "react";

export default function ExternalCalendarsCard() {
  return (
    <div className="hc-card">
      <div className="hc-card-title">External calendars</div>
      <div className="hc-card-actions col">
        <button className="hc-btn ghost">Connect Google</button>
        <button className="hc-btn ghost">Import .ics</button>
        <button className="hc-btn">Export .ics</button>
        <button className="hc-icon-btn" title="Refresh">⟲</button>
      </div>
    </div>
  );
}