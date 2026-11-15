import React, { useCallback, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { LISTING_STATUS } from "../../hostproperty/utils/listingStatus";
import { PROPERTY_REVIEW_LIST_PATH } from "../propertyReviewPaths";
import pageStyles from "../PropertyReviewPage.module.css";
import { approveListing, rejectListing } from "../services/propertyReviewApi";
import ApproveDialog from "./ApproveDialog";
import styles from "./PropertyReviewDetail.module.css";
import RejectDialog from "./RejectDialog";
import useReviewAction from "./useReviewAction";

const APPROVED_MESSAGE = "Listing approved.";
const REJECTED_MESSAGE = "Listing rejected.";
const ALREADY_REVIEWED_MESSAGE = "This listing was already reviewed.";
const STALE_NOTICE = "This listing changed since you opened it. Please review it again.";

function ReviewActions({ propertyId, status, updatedAt, reloading, reload }) {
  const navigate = useNavigate();
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");

  const approve = useCallback(() => approveListing(propertyId, updatedAt), [propertyId, updatedAt]);
  const reject = useCallback(
    () => rejectListing(propertyId, updatedAt, reason.trim()),
    [propertyId, updatedAt, reason]
  );

  const closeDialogs = useCallback(() => {
    setApproveOpen(false);
    setRejectOpen(false);
  }, []);

  const finish = useCallback(
    (message) => {
      toast.success(message);
      navigate(PROPERTY_REVIEW_LIST_PATH);
    },
    [navigate]
  );

  const handleApproved = useCallback(() => finish(APPROVED_MESSAGE), [finish]);
  const handleRejected = useCallback(() => finish(REJECTED_MESSAGE), [finish]);

  const handleStale = useCallback(() => {
    closeDialogs();
    setNotice(STALE_NOTICE);
    reload();
  }, [closeDialogs, reload]);

  const handleWrongStatus = useCallback(() => {
    closeDialogs();
    setReason("");
    toast.info(ALREADY_REVIEWED_MESSAGE);
    reload();
  }, [closeDialogs, reload]);

  const handlers = { onStale: handleStale, onWrongStatus: handleWrongStatus };
  const approveAction = useReviewAction({ action: approve, onSuccess: handleApproved, ...handlers });
  const rejectAction = useReviewAction({ action: reject, onSuccess: handleRejected, ...handlers });

  const isPendingReview = status === LISTING_STATUS.PENDING_REVIEW;

  const openApprove = () => {
    approveAction.clearError();
    setNotice("");
    setApproveOpen(true);
  };

  const openReject = () => {
    rejectAction.clearError();
    setNotice("");
    setRejectOpen(true);
  };

  return (
    <>
      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}
      {isPendingReview && (
        <>
          <button type="button" className={pageStyles.retryButton} onClick={openApprove} disabled={reloading}>
            Approve
          </button>
          <button type="button" className={pageStyles.retryButton} onClick={openReject} disabled={reloading}>
            Reject
          </button>
        </>
      )}
      {approveOpen && (
        <ApproveDialog
          submitting={approveAction.submitting}
          errorMessage={approveAction.errorMessage}
          onConfirm={() => void approveAction.submit()}
          onClose={() => setApproveOpen(false)}
        />
      )}
      {rejectOpen && (
        <RejectDialog
          reason={reason}
          submitting={rejectAction.submitting}
          errorMessage={rejectAction.errorMessage}
          onReasonChange={setReason}
          onSubmit={() => void rejectAction.submit()}
          onClose={() => setRejectOpen(false)}
        />
      )}
    </>
  );
}

ReviewActions.propTypes = {
  propertyId: PropTypes.string.isRequired,
  status: PropTypes.string,
  updatedAt: PropTypes.number,
  reloading: PropTypes.bool.isRequired,
  reload: PropTypes.func.isRequired,
};

export default ReviewActions;
