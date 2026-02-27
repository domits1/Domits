import React from "react";

export default function CalendarLinkCard({ connectedCount, onOpenSettings }) {
  const safeConnectedCount = Math.max(0, Number(connectedCount) || 0);
  const connectedLine =
    safeConnectedCount === 1
      ? "1 calendar connected"
      : `${safeConnectedCount} calendars connected`;

  return (
    <section className="hc-info-card" aria-label="Calendar sync summary">
      <header className="hc-info-card-header">
        <h3 className="hc-info-card-title">Sync calendars</h3>
        <button
          type="button"
          className="hc-info-card-chevron hc-info-card-chevron-btn"
          aria-label="Open calendar sync settings"
          onClick={() => onOpenSettings?.()}
        >
          <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
            <path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      </header>

      <p className="hc-info-card-line">Link your calendar with other websites</p>
      <p className="hc-info-card-line">{connectedLine}</p>
    </section>
  );
}
