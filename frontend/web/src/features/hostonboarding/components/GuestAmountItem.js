import React from "react";
import PropTypes from "prop-types";

function GuestAmountItem({ label, value, increment, decrement, setValue, max }) {
  const handleFocus = (event) => {
    if (value === 0) {
      event.target.select();
    }
  };

  return (
    <div className="guest-amount-item">
      <span className="guest-amount-label">{label}</span>
      <fieldset className="guest-amount-controls" aria-label={`${label} controls`}>
        <button className="guest-amount-btn" onClick={decrement} disabled={value <= 0}>
          -
        </button>
        <input
          type="number"
          min={0}
          max={max}
          inputMode="numeric"
          className="guest-amount-input"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onFocus={handleFocus}
          onClick={handleFocus}
          aria-label={`${label} amount`}
        />
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
  setValue: PropTypes.func.isRequired,
  max: PropTypes.number.isRequired,
};
