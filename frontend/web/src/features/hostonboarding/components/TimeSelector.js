import React from "react";

function TimeSelector({ label, time, onChange }) {
  function numberToTimeString(hour) {
    const paddedHour = hour.toString().padStart(2, '0');
    return `${paddedHour}:00`;
  }

  return (
    <label className="Check">
      <div className="Check-label">{label}</div>
      <span>From</span>
      <select
        className="Check-checkbox"
        value={numberToTimeString(time.from)}
        onChange={(e) => onChange("from", e.target.value)}
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
        value={numberToTimeString(time.till)}
        onChange={(e) => onChange("till", e.target.value)}
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
