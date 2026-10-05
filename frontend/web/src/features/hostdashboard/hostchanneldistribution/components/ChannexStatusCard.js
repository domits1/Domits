import React from "react";
import PropTypes from "prop-types";

// Buckets the six CHANNEX_STATUS values from GET /integrations/channex/status into the three
// visual states this card renders. VALIDATION_FAILED, DISCONNECTED and RECONNECT_REQUIRED all
// read the same to a host ("something's wrong, reconnect"), so they share one look.
const RECONNECT_BUCKET_STATUSES = new Set(["RECONNECT_REQUIRED", "VALIDATION_FAILED", "DISCONNECTED"]);

function getStatusPresentation(status) {
  if (status === "CONNECTED") {
    return { tone: "success", label: "Connected", showReason: false };
  }
  if (RECONNECT_BUCKET_STATUSES.has(status)) {
    return { tone: "error", label: "Reconnect needed", showReason: true };
  }
  // PENDING_PROVIDER_VALIDATION: not reachable through the connect flow today, but the response
  // shape allows it, so it gets its own neutral state rather than being misread as an error.
  return { tone: "pending", label: "Validating…", showReason: false };
}

function ChannexStatusCard({ status }) {
  const presentation = getStatusPresentation(status.status);

  return (
    <div className="chdist-card">
      <div className="chdist-card__row">
        <span className="chdist-card__name">{status.displayName || "Channex"}</span>
        <span className={`chdist-badge chdist-badge--${presentation.tone}`}>{presentation.label}</span>
        <button className="chdist-btn chdist-btn--manage" disabled>
          Manage
        </button>
      </div>
      {presentation.showReason && status.reason && <p className="chdist-card__reason">{status.reason}</p>}
    </div>
  );
}

ChannexStatusCard.propTypes = {
  status: PropTypes.shape({
    status: PropTypes.string.isRequired,
    displayName: PropTypes.string,
    reason: PropTypes.string,
  }).isRequired,
};

export default ChannexStatusCard;
