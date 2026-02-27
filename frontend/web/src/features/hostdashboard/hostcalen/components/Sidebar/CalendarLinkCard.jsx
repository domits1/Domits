import React from "react";
import arrowRightIcon from "../../../../../images/arrow-right-icon.svg";

export default function CalendarLinkCard({ connectedCount, onOpenSettings }) {
  const safeConnectedCount = Math.max(0, Number(connectedCount) || 0);
  const connectedLine =
    safeConnectedCount === 1
      ? "1 calendar connected"
      : `${safeConnectedCount} calendars connected`;
  const openSettings = () => onOpenSettings?.();

  return (
    <section
      className="hc-info-card hc-info-card--interactive"
      aria-label="Open calendar sync settings"
      role="button"
      tabIndex={0}
      onClick={openSettings}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openSettings();
        }
      }}
    >
      <header className="hc-info-card-header">
        <h3 className="hc-info-card-title">Sync calendars</h3>
        <span className="hc-info-card-chevron" aria-hidden="true">
          <img src={arrowRightIcon} alt="" aria-hidden="true" className="hc-chevron-icon" />
        </span>
      </header>

      <p className="hc-info-card-line">Link your calendar with other websites</p>
      <p className="hc-info-card-line">{connectedLine}</p>
    </section>
  );
}
