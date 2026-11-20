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

// Shown instead of the OTA cards when provisioning stopped halfway (D2). Retry asks the caller to
// turn distribution on again, and is disabled while that request runs.
export function SetupFailedNotice({ onRetry, busy = false }) {
  return (
    <div className="host-chdist__error" role="alert">
      <p className="host-chdist__error-text">{SETUP_FAILED_MESSAGE}</p>
      <button type="button" className="chdist-btn chdist-btn--primary" disabled={busy} onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

SetupFailedNotice.propTypes = {
  onRetry: PropTypes.func.isRequired,
  busy: PropTypes.bool,
};
