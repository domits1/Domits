import React from "react";
import PropTypes from "prop-types";
import CalendarProviderSelect from "./CalendarProviderSelect";

export default function CalendarSourceFields({
  externalCalendarUrlInput,
  onExternalCalendarUrlChange,
  calendarNameInput,
  onCalendarNameChange,
  calendarProviderInput,
  onCalendarProviderChange,
}) {
  return (
    <div className="hc-sync-fields">
      <input
        type="text"
        className="hc-sync-input"
        placeholder="Other website link"
        value={externalCalendarUrlInput}
        onChange={(event) => onExternalCalendarUrlChange?.(event.target.value)}
      />
      <input
        type="text"
        className="hc-sync-input"
        placeholder="Calendar name"
        value={calendarNameInput}
        onChange={(event) => onCalendarNameChange?.(event.target.value)}
      />
      <CalendarProviderSelect value={calendarProviderInput} onChange={onCalendarProviderChange} />
    </div>
  );
}

CalendarSourceFields.propTypes = {
  externalCalendarUrlInput: PropTypes.string,
  onExternalCalendarUrlChange: PropTypes.func,
  calendarNameInput: PropTypes.string,
  onCalendarNameChange: PropTypes.func,
  calendarProviderInput: PropTypes.string,
  onCalendarProviderChange: PropTypes.func,
};
