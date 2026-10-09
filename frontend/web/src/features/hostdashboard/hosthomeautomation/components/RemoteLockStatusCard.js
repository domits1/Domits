import React from "react";
import PropTypes from "prop-types";
import { getStatusPresentation } from "../constants/homeAutomationConstants";
import { formatDateTime } from "../utils/formatDateTime";

// Read-only: it shows the connection status and the last sync. The actions in STATUS_PRESENTATION are not
// rendered yet.
function RemoteLockStatusCard({ status, lastSyncAt, copy, language }) {
  const { tone, labelKey } = getStatusPresentation(status);
  const lastSync = lastSyncAt ? formatDateTime(lastSyncAt, language) : "";

  return (
    <section className="host-homeauto__card" aria-label={copy.provider}>
      <div className="host-homeauto__row">
        <h2 className="host-homeauto__provider">{copy.provider}</h2>
        <span className={`host-homeauto__badge host-homeauto__badge--${tone}`}>{copy.statuses[labelKey]}</span>
      </div>
      <p className="host-homeauto__meta">
        {copy.lastSync.label}: {lastSync || copy.lastSync.never}
      </p>
    </section>
  );
}

RemoteLockStatusCard.propTypes = {
  status: PropTypes.string,
  lastSyncAt: PropTypes.number,
  copy: PropTypes.shape({
    provider: PropTypes.string.isRequired,
    statuses: PropTypes.objectOf(PropTypes.string).isRequired,
    lastSync: PropTypes.shape({ label: PropTypes.string.isRequired, never: PropTypes.string.isRequired }).isRequired,
  }).isRequired,
  language: PropTypes.string.isRequired,
};

export default RemoteLockStatusCard;
