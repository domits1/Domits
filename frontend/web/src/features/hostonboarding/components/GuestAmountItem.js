import React from "react";
import PropTypes from "prop-types";

function GuestAmountItem({ label, value, increment, decrement, max }) {
  return (
    <div className="guest-amount-item">
      <span className="guest-amount-label">{label}</span>
      <fieldset className="guest-amount-controls" aria-label={`${label} controls`}>
        <button className="guest-amount-btn" onClick={decrement} disabled={value <= 0}>
          -
        </button>
        <span className="guest-amount-value" aria-live="polite">
          {value}
        </span>
        <button
          className="guest-amount-btn guest-amount-btn-plus"
          onClick={increment}
          disabled={value >= max}
        >
          +
        </button>
      </fieldset>
    </div>
  );
}

export default GuestAmountItem;

GuestAmountItem.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  increment: PropTypes.func.isRequired,
  decrement: PropTypes.func.isRequired,
  max: PropTypes.number.isRequired,
};
