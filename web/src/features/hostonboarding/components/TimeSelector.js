import React from "react";
import "../styles/onboardingHost.scss";

function TimeSelector({ label, time, onChange, error }) {
  const timeOptions = React.useMemo(() =>
    Array.from({ length: 24 }, (_, i) => {
      const hour = i.toString().padStart(2, "0");
      const timeStr = `${hour}:00`;
      return (
        <option key={timeStr} value={timeStr}>
          {timeStr}
        </option>
      );
    }), []);

  const hasError = error && (error.field === 'from' || error.field === 'till');
  const defaultTimeValue = "00:00";

  return (
    <label className={`Check time-selector-label ${hasError ? 'has-error' : ''}`}>
      <div className="Check-label">{label}</div>
      <div className="time-inputs">
        <span>From</span>
        <select
          className={`Check-checkbox time-select ${error?.field === 'from' ? 'input-error' : ''}`}
          value={time?.from || defaultTimeValue}
          onChange={(e) => onChange("from", e.target.value)}
        >
          {/* Add a default disabled option if needed, or ensure "00:00" is selectable */}
          {/* <option value={defaultTimeValue} disabled={!time?.from}>Select time</option> */}
          {timeOptions}
        </select>
        <span>Till</span>
        <select
          className={`Check-checkbox time-select ${error?.field === 'till' ? 'input-error' : ''}`}
          value={time?.till || defaultTimeValue}
          onChange={(e) => onChange("till", e.target.value)}
        >
          {/* <option value={defaultTimeValue} disabled={!time?.till}>Select time</option> */}
          {timeOptions}
        </select>
      </div>
      {error && <span className="error-message time-error-message">{error.message}</span>}
    </label>
  );
}

export default TimeSelector;