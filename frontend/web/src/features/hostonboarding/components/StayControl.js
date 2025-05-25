import React from "react";

function StayControl({ label, value, onIncrement, onDecrement }) {
  return (
    <div className="stayMinMaxField">
      <label className="minMaxLabel">{label}</label>
      <div className="minMaxButtons">
        <button className="round-button" onClick={onDecrement}>
          -
        </button>
        <span>{value}</span>
        <button className="round-button" onClick={onIncrement}>
          +
        </button>
      </div>
    </div>
  );
}

export default StayControl;
