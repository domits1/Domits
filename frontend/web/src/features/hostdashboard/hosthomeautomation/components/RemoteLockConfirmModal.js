import React, { useId, useState } from "react";
import PropTypes from "prop-types";
import ChannexModalShell from "../../hostchanneldistribution/components/ChannexModalShell";
import { connectRemoteLock, disconnectRemoteLock } from "../services/remoteLockService";
// The shell and its buttons are styled by the Distribution tab's stylesheet, which this page does not otherwise
// load, and its colour variables are defined on .host-chdist. Until a shared modal is extracted (follow-up),
// import it here and render the modal inside that class.
import "../../hostchanneldistribution/styles/HostChannelDistribution.css";

// Connect and reconnect run the same request: the host signs in to RemoteLock again either way.
export const VARIANT_REQUESTS = {
  connect: connectRemoteLock,
  reconnect: connectRemoteLock,
  disconnect: disconnectRemoteLock,
};

function RemoteLockConfirmModal({ variant, copy, onClose, onDone }) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const titleId = useId();
  const { title, body, confirm, confirming } = copy.modal[variant];
  const confirmClass = variant === "disconnect" ? "chdist-btn--danger" : "chdist-btn--primary";

  const handleConfirm = async () => {
    setSubmitting(true);
    setErrorMessage("");
    try {
      onDone(await VARIANT_REQUESTS[variant]());
    } catch (error) {
      // The host sees a fixed message; the real detail goes to the console.
      console.error(`Failed to ${variant} RemoteLock:`, error?.message || error);
      setErrorMessage(copy.modal.error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="host-chdist host-homeauto__modal-scope">
      <ChannexModalShell titleId={titleId} title={title} onClose={onClose} closeDisabled={submitting}>
        <p className="chdist-modal__note">{body}</p>

        {errorMessage && (
          <p className="chdist-modal__error" role="alert">
            {errorMessage}
          </p>
        )}

        <div className="chdist-modal__actions">
          <button type="button" className="chdist-btn chdist-btn--secondary" onClick={onClose} disabled={submitting}>
            {copy.modal.cancel}
          </button>
          <button
            type="button"
            className={`chdist-btn ${confirmClass}`}
            onClick={handleConfirm}
            disabled={submitting}>
            {submitting ? confirming : confirm}
          </button>
        </div>
      </ChannexModalShell>
    </div>
  );
}

const variantCopy = PropTypes.shape({
  title: PropTypes.string.isRequired,
  body: PropTypes.string.isRequired,
  confirm: PropTypes.string.isRequired,
  confirming: PropTypes.string.isRequired,
});

RemoteLockConfirmModal.propTypes = {
  variant: PropTypes.oneOf(Object.keys(VARIANT_REQUESTS)).isRequired,
  copy: PropTypes.shape({
    modal: PropTypes.shape({
      connect: variantCopy.isRequired,
      reconnect: variantCopy.isRequired,
      disconnect: variantCopy.isRequired,
      cancel: PropTypes.string.isRequired,
      error: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onDone: PropTypes.func.isRequired,
};

export default RemoteLockConfirmModal;
