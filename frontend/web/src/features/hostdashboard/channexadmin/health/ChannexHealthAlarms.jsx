import React from "react";
import PropTypes from "prop-types";
import ChannexHealthPanel from "./ChannexHealthPanel";
import ChannexHealthTime from "./ChannexHealthTime";

export default function ChannexHealthAlarms({ alarms }) {
  const emptyText = alarms.available
    ? "No alarms found."
    : `Alarm states are unavailable (${alarms.reason}).`;

  return (
    <ChannexHealthPanel title="Alarms" emptyText={emptyText} isEmpty={alarms.items.length === 0}>
      {alarms.items.map((alarm) => (
        <li key={alarm.name}>
          <span>{alarm.name}</span>
          <span className={`channex-health-state channex-health-state--${alarm.state.toLowerCase()}`}>
            {alarm.state}
          </span>
          <ChannexHealthTime time={alarm.updatedAt} />
        </li>
      ))}
    </ChannexHealthPanel>
  );
}

ChannexHealthAlarms.propTypes = {
  alarms: PropTypes.shape({
    available: PropTypes.bool.isRequired,
    reason: PropTypes.string,
    items: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired,
        state: PropTypes.string.isRequired,
        updatedAt: PropTypes.number,
      })
    ).isRequired,
  }).isRequired,
};
