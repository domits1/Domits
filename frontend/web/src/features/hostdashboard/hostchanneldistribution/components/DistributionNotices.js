import React from "react";
import PropTypes from "prop-types";

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

// Also what the connect flow says while it turns a listing on, so the two never read differently.
export const SETTING_UP_MESSAGE = "Setting up your listing…";

// Shown instead of the cards while a listing is being set up (D2); Retry turns it on again, which resumes it.
export function SettingUpNotice({ onRetry, busy = false }) {
  return (
    <div className="host-chdist__empty">
      <output className="host-chdist__empty-text">{SETTING_UP_MESSAGE}</output>
      <button type="button" className="chdist-btn chdist-btn--primary" disabled={busy} onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

SettingUpNotice.propTypes = {
  onRetry: PropTypes.func.isRequired,
  busy: PropTypes.bool,
};
