import React, { useId, useRef } from "react";
import PropTypes from "prop-types";
import ChannexModalShell from "../../hostchanneldistribution/components/ChannexModalShell";
import "../../hostchanneldistribution/styles/HostChannelDistribution.css";
import styles from "./PropertyReviewDetail.module.css";

function ApproveDialog({ submitting, errorMessage, onConfirm, onClose }) {
  const titleId = useId();
  const cancelRef = useRef(null);

  return (
    <div className={`host-chdist ${styles.dialogScope}`}>
      <ChannexModalShell
        titleId={titleId}
        title="Approve this listing?"
        onClose={onClose}
        closeDisabled={submitting}
        initialFocusRef={cancelRef}>
        <p className="chdist-modal__note">Approving removes the listing from the review queue.</p>
        {errorMessage && <p className="chdist-modal__error">{errorMessage}</p>}
        <div className="chdist-modal__actions">
          <button
            type="button"
            ref={cancelRef}
            className="chdist-btn chdist-btn--secondary"
            onClick={onClose}
            disabled={submitting}>
            Cancel
          </button>
          <button type="button" className="chdist-btn chdist-btn--primary" onClick={onConfirm} disabled={submitting}>
            {submitting ? "Approving…" : "Confirm approval"}
          </button>
        </div>
      </ChannexModalShell>
    </div>
  );
}

ApproveDialog.propTypes = {
  submitting: PropTypes.bool.isRequired,
  errorMessage: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ApproveDialog;
