import React from 'react';

function GuestAmountItem({ label, value, increment, decrement, max }) {
  return (
    <div className="guest-amount-item">
      <span className="guest-amount-label">{label}</span>
      <div className="guest-amount-controls" role="group" aria-label={`${label} controls`}>
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
      </div>
    </div>
  );
}

export default GuestAmountItem;