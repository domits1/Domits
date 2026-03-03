import React from "react";
import PropTypes from "prop-types";
import arrowRightIcon from "../../../../../images/arrow-right-icon.svg";

export default function CalendarLinkCard({ connectedCount, onOpenSettings }) {
  const safeConnectedCount = Math.max(0, Number(connectedCount) || 0);
  const connectedLine =
    safeConnectedCount === 1
      ? "1 calendar connected"
      : `${safeConnectedCount} calendars connected`;

  return (
    <section className="hc-info-card hc-info-card--interactive">
      <button
        type="button"
        className="hc-info-card-hitarea"
        aria-label="Open calendar sync settings"
        onClick={() => onOpenSettings?.()}
      />
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

CalendarLinkCard.propTypes = {
  connectedCount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onOpenSettings: PropTypes.func,
};
