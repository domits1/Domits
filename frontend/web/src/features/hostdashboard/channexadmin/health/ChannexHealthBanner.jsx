import React from "react";
import PropTypes from "prop-types";
import { STATUS_LABELS, describeReason } from "./channexHealthFormat";

export default function ChannexHealthBanner({ status, reasons }) {
  return (
    <div className={`channex-health-banner channex-health-banner--${status.toLowerCase()}`}>
      <h2>{STATUS_LABELS[status] ?? status}</h2>
      {reasons.length > 0 && (
        <ul>
          {reasons.map((reason) => (
            <li key={`${reason.code}-${reason.alarm ?? ""}`}>{describeReason(reason)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

ChannexHealthBanner.propTypes = {
  status: PropTypes.string.isRequired,
  reasons: PropTypes.arrayOf(PropTypes.shape({ code: PropTypes.string.isRequired, alarm: PropTypes.string }))
    .isRequired,
};
