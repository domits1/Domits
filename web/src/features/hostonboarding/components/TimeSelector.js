import React from "react";

function TimeSelector({ label, time, onChange }) {
  return (
    <label className="Check">
      <div className="Check-label">{label}</div>
      <span>From</span>
      <select
        className="Check-checkbox"
        value={time.From}
        onChange={(e) => onChange("From", e.target.value)}
      >
        {Array.from({ length: 24 }, (_, i) => {
          const time = i.toString().padStart(2, "0") + ":00";
          return (
            <option key={time} value={time}>
              {time}
            </option>
          );
        })}
      </select>
      <span>Til</span>
      <select
        className="Check-checkbox"
        value={time.Til}
        onChange={(e) => onChange("Til", e.target.value)}
      >
        {Array.from({ length: 24 }, (_, i) => {
          const time = i.toString().padStart(2, "0") + ":00";
          return (
            <option key={time} value={time}>
              {time}
            </option>
          );
        })}
      </select>
    </label>
  );
}

export default TimeSelector;
