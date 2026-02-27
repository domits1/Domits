import React from "react";
import arrowRightIcon from "../../../../../images/arrow-right-icon.svg";

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
          <img src={arrowRightIcon} alt="" aria-hidden="true" className="hc-chevron-icon" />
        </button>
      </header>

      <p className="hc-info-card-line">Link your calendar with other websites</p>
      <p className="hc-info-card-line">{connectedLine}</p>
    </section>
  );
}
