import React, { useId, useRef } from "react";
import PropTypes from "prop-types";
import ChannexModalShell from "../../hostchanneldistribution/components/ChannexModalShell";
import "../../hostchanneldistribution/styles/HostChannelDistribution.css";
import styles from "./PropertyReviewDetail.module.css";

export const MAX_REASON_LENGTH = 500;

function RejectDialog({ reason, submitting, errorMessage, onReasonChange, onSubmit, onClose }) {
  const titleId = useId();
  const reasonId = useId();
  const reasonRef = useRef(null);
  const reasonLength = reason.trim().length;
  const reasonIsValid = reasonLength > 0 && reasonLength <= MAX_REASON_LENGTH;

  return (
    <div className={`host-chdist ${styles.dialogScope}`}>
      <ChannexModalShell
        titleId={titleId}
        title="Reject this listing?"
        onClose={onClose}
        closeDisabled={submitting}
        initialFocusRef={reasonRef}>
        <div className="chdist-modal__field">
          <label className="chdist-modal__label" htmlFor={reasonId}>
            Reason
          </label>
          <textarea
            id={reasonId}
            ref={reasonRef}
            className="chdist-modal__input"
            rows={5}
            maxLength={MAX_REASON_LENGTH}
            value={reason}
            disabled={submitting}
            onChange={(event) => onReasonChange(event.target.value)}
          />
          <p className={styles.reasonCounter}>{`${reasonLength} / ${MAX_REASON_LENGTH}`}</p>
        </div>
        {errorMessage && <p className="chdist-modal__error">{errorMessage}</p>}
        <div className="chdist-modal__actions">
          <button type="button" className="chdist-btn chdist-btn--secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="button"
            className="chdist-btn chdist-btn--primary"
            onClick={onSubmit}
            disabled={submitting || !reasonIsValid}>
            {submitting ? "Rejecting…" : "Reject listing"}
          </button>
        </div>
      </ChannexModalShell>
    </div>
  );
}

RejectDialog.propTypes = {
  reason: PropTypes.string.isRequired,
  submitting: PropTypes.bool.isRequired,
  errorMessage: PropTypes.string.isRequired,
  onReasonChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default RejectDialog;
