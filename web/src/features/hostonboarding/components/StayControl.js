import React from 'react'

function StayControl({label, value, onIncrement, onDecrement, maxLimit}) {
  return (
    <div className="stayMinMaxField">
      <label className="minMaxLabel">{label}</label>
      <div className="minMaxButtons">
        <button className="round-button" onClick={onDecrement}>
          -
        </button>
        {value}
        <button
          className="round-button"
          onClick={onIncrement}
          disabled={value >= maxLimit}>
          +
        </button>
      </div>
    </div>
  )
}

export default StayControl
