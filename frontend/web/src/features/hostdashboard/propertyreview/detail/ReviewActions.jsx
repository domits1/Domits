import React, { useCallback, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { LISTING_STATUS } from "../../hostproperty/utils/listingStatus";
import { PROPERTY_REVIEW_LIST_PATH } from "../propertyReviewPaths";
import pageStyles from "../PropertyReviewPage.module.css";
import { approveListing } from "../services/propertyReviewApi";
import ApproveDialog from "./ApproveDialog";
import styles from "./PropertyReviewDetail.module.css";
import useReviewAction from "./useReviewAction";

const APPROVED_MESSAGE = "Listing approved.";
const ALREADY_REVIEWED_MESSAGE = "This listing was already reviewed.";
const STALE_NOTICE = "This listing changed since you opened it. Please review it again.";

function ReviewActions({ propertyId, status, updatedAt, reloading, reload }) {
  const navigate = useNavigate();
  const [approveOpen, setApproveOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const approve = useCallback(() => approveListing(propertyId, updatedAt), [propertyId, updatedAt]);

  const handleApproved = useCallback(() => {
    toast.success(APPROVED_MESSAGE);
    navigate(PROPERTY_REVIEW_LIST_PATH);
  }, [navigate]);

  const handleStale = useCallback(() => {
    setApproveOpen(false);
    setNotice(STALE_NOTICE);
    reload();
  }, [reload]);

  const handleWrongStatus = useCallback(() => {
    setApproveOpen(false);
    toast.info(ALREADY_REVIEWED_MESSAGE);
    reload();
  }, [reload]);

  const { submit, submitting, errorMessage, clearError } = useReviewAction({
    action: approve,
    onSuccess: handleApproved,
    onStale: handleStale,
    onWrongStatus: handleWrongStatus,
  });

  const isPendingReview = status === LISTING_STATUS.PENDING_REVIEW;

  const openApprove = () => {
    clearError();
    setNotice("");
    setApproveOpen(true);
  };

  return (
    <>
      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}
      {isPendingReview && (
        <button type="button" className={pageStyles.retryButton} onClick={openApprove} disabled={reloading}>
          Approve
        </button>
      )}
      {approveOpen && (
        <ApproveDialog
          submitting={submitting}
          errorMessage={errorMessage}
          onConfirm={() => void submit()}
          onClose={() => setApproveOpen(false)}
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
