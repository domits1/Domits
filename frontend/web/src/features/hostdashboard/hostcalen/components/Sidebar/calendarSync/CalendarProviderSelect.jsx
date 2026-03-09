import React from "react";
import PropTypes from "prop-types";
import { CALENDAR_PROVIDER, CALENDAR_PROVIDER_OPTIONS } from "../../../hooks/hostCalendarHelpers";

export default function CalendarProviderSelect({ value, onChange }) {
  return (
    <select
      className="hc-sync-input hc-sync-input--select"
      value={String(value || CALENDAR_PROVIDER.AUTO).toLowerCase()}
      onChange={(event) => onChange?.(event.target.value)}
    >
      {CALENDAR_PROVIDER_OPTIONS.map((providerOption) => (
        <option key={providerOption.value} value={providerOption.value}>
          {providerOption.label}
        </option>
      ))}
    </select>
  );
}

CalendarProviderSelect.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
};
