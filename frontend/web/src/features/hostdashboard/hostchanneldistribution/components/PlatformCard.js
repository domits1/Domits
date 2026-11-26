import React from "react";
import PropTypes from "prop-types";
import bookingLogo from "../../../../images/icon-booking.png";
import airbnbLogo from "../../../../images/icon-airbnb.png";
import vrboLogo from "../../../../images/icon-vrbo.png";

const LOGOS = { BookingCom: bookingLogo, Airbnb: airbnbLogo, Vrbo: vrboLogo };

// One OTA card: name, badge, switch. `state` comes from describePlatformCard (utils/distributionStates.js).
// Without onToggle the switch stays disabled, so it never looks usable while it does nothing. A switch
// that is on also stays disabled until turnOffEnabled: turning off is a disconnect, and that flow
// does not exist yet.
function PlatformCard({ platform, state, onToggle, turnOffEnabled = false }) {
  const switchLocked = state.switchDisabled || !onToggle || (state.switchOn && !turnOffEnabled);
  const noteClassName = state.tone === "error" ? "chdist-card__reason" : "chdist-card__meta";

  return (
    <div className="chdist-card">
      <div className="chdist-card__row">
        <span className="chdist-platform__identity">
          {/* Decorative: the name next to it already says which platform this is. */}
          <img className="chdist-platform__logo" src={LOGOS[platform.otaCode]} alt="" />
          <span className="chdist-card__name">{platform.name}</span>
        </span>
        <span className="chdist-platform__controls">
          <span className={`chdist-badge chdist-badge--${state.tone}`}>{state.label}</span>
          <label className="chdist-switch">
            <input
              type="checkbox"
              role="switch"
              aria-label={`${platform.name} distribution`}
              checked={state.switchOn}
              disabled={switchLocked}
              onChange={() => onToggle?.({ otaCode: platform.otaCode, turnOn: !state.switchOn })}
            />
            <span className="chdist-switch__track" aria-hidden="true" />
          </label>
        </span>
      </div>
      {state.note && <p className={noteClassName}>{state.note}</p>}
    </div>
  );
}

PlatformCard.propTypes = {
  platform: PropTypes.shape({
    otaCode: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  }).isRequired,
  state: PropTypes.shape({
    label: PropTypes.string.isRequired,
    tone: PropTypes.string.isRequired,
    switchOn: PropTypes.bool.isRequired,
    switchDisabled: PropTypes.bool.isRequired,
    note: PropTypes.string,
  }).isRequired,
  onToggle: PropTypes.func,
  turnOffEnabled: PropTypes.bool,
};

export default PlatformCard;
