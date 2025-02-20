import React from 'react'

function GuestAmountItem({label, value, increment, decrement, max}) {
  return (
    <div className="guest-amount-item">
      <p>{label}</p>
      <div className="amount-btn-box">
        <button
          className="round-button"
          onClick={decrement}
          disabled={value <= 0}>
          -
        </button>
        {value}
        <button
          className="round-button"
          onClick={increment}
          disabled={value >= max}>
          +
        </button>
      </div>
    </div>
  )
}

export default GuestAmountItem
