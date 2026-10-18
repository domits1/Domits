import React from "react";
import PropTypes from "prop-types";
import { getStatusPresentation } from "../constants/homeAutomationConstants";
import { formatDateTime } from "../utils/formatDateTime";

export const ACTION_BUTTON_CLASS = {
  connect: "host-homeauto__action--primary",
  reconnect: "host-homeauto__action--primary",
  disconnect: "host-homeauto__action--danger",
};

// Shows the connection status and the last sync, with a button for each action the status allows. It does not run
// the action: it tells the page which one the host picked.
function RemoteLockStatusCard({ status, lastSyncAt, copy, language, onAction }) {
  const { tone, labelKey, actions } = getStatusPresentation(status);
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
      {actions.length > 0 && (
        <div className="host-homeauto__actions">
          {actions.map((action) => (
            <button
              key={action}
              type="button"
              className={`host-homeauto__action ${ACTION_BUTTON_CLASS[action]}`}
              onClick={() => onAction(action)}>
              {copy.actions[action]}
            </button>
          ))}
        </div>
      )}
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
    actions: PropTypes.objectOf(PropTypes.string).isRequired,
  }).isRequired,
  language: PropTypes.string.isRequired,
  onAction: PropTypes.func.isRequired,
};

export default RemoteLockStatusCard;
