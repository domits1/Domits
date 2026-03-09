import React from "react";
import PropTypes from "prop-types";
import arrowRightIcon from "../../../../../../images/arrow-right-icon.svg";
import calendarIcon from "../../../../../../images/icons/calendar.png";

export default function ConnectPromptSection({ onOpenConnectionSetup, connectedSection }) {
  return (
    <section className="hc-sync-step">
      <h4 className="hc-sync-step-title">Connect calendars</h4>
      <p className="hc-sync-step-copy">Sync all your hosting calendars so they stay up to date.</p>
      <button
        type="button"
        className="hc-availability-connect-btn"
        onClick={() => onOpenConnectionSetup(true)}
      >
        <span className="hc-availability-connect-btn-label">
          <span className="hc-availability-connect-btn-icon" aria-hidden="true">
            <img src={calendarIcon} alt="" />
          </span>
          <span>Connect to another website</span>
        </span>
        <img src={arrowRightIcon} alt="" aria-hidden="true" className="hc-chevron-icon" />
      </button>
      {connectedSection}
    </section>
  );
}

ConnectPromptSection.propTypes = {
  onOpenConnectionSetup: PropTypes.func,
  connectedSection: PropTypes.node,
};
