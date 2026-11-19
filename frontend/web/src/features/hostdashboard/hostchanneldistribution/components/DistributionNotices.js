import React from "react";
import PropTypes from "prop-types";

const SETUP_FAILED_MESSAGE = "Something went wrong while setting up. Try again.";

// Shown instead of the OTA cards when the listing cannot turn on distribution yet (D3).
export function NotReadyNotice({ items }) {
  return (
    <div className="host-chdist__empty">
      <ul className="chdist-notice__list">
        {items.map((item) => (
          <li key={item} className="host-chdist__empty-text">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

NotReadyNotice.propTypes = {
  items: PropTypes.arrayOf(PropTypes.string).isRequired,
};

// Shown instead of the OTA cards when provisioning stopped halfway (D2). The retry button comes
// with the pull request that wires the turn-on flow.
export function SetupFailedNotice() {
  return (
    <div className="host-chdist__error" role="alert">
      <p className="host-chdist__error-text">{SETUP_FAILED_MESSAGE}</p>
    </div>
  );
}
