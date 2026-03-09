import React from "react";
import PropTypes from "prop-types";
import { REMOVE_SOURCE_FLOW_STEP, REMOVE_SOURCE_REASONS } from "./calendarSyncConstants";
import { useDismissOnOutsideMouseDown, useShowModalEffect } from "./calendarSyncHooks";

export default function RemoveSourceModal({
  isOpen,
  isRemovingPendingSource,
  isRemoveReasonStep,
  selectedRemoveReasonIdSet,
  handleToggleRemoveReason,
  pendingRemoveSourceName,
  addCalendarError,
  resetRemoveSourceFlow,
  setRemoveSourceFlowStep,
  handleRemoveReasonsNext,
  handleConfirmRemoveSource,
  removeConfirmButtonLabel,
  hasSelectedRemoveReason,
}) {
  const dialogRef = React.useRef(null);
  const modalContentRef = React.useRef(null);

  useShowModalEffect(isOpen, dialogRef);

  const handleDismiss = React.useCallback(() => {
    if (!isRemovingPendingSource) {
      resetRemoveSourceFlow();
    }
  }, [isRemovingPendingSource, resetRemoveSourceFlow]);

  useDismissOnOutsideMouseDown({
    isOpen,
    modalContentRef,
    onDismiss: handleDismiss,
  });

  if (!isOpen) {
    return null;
  }

  return (
    <dialog
      ref={dialogRef}
      className="hc-sync-remove-modal-backdrop"
      aria-label="Remove calendar connection"
      onCancel={(event) => {
        event.preventDefault();
        handleDismiss();
      }}
    >
      <section ref={modalContentRef} className="hc-sync-remove-modal">
        {isRemoveReasonStep ? (
          <>
            <h4 className="hc-sync-remove-modal-title">Why are you disconnecting this calendar?</h4>
            <p className="hc-sync-remove-modal-copy">Choose all reasons that apply.</p>
            <div className="hc-sync-remove-reasons-list">
              {REMOVE_SOURCE_REASONS.map((reason) => (
                <label key={reason.id} className="hc-sync-remove-reason-row">
                  <input
                    type="checkbox"
                    className="hc-sync-remove-reason-checkbox"
                    checked={selectedRemoveReasonIdSet.has(reason.id)}
                    onChange={() => handleToggleRemoveReason(reason.id)}
                    disabled={isRemovingPendingSource}
                  />
                  <span>{reason.label}</span>
                </label>
              ))}
            </div>
          </>
        ) : (
          <>
            <h4 className="hc-sync-remove-modal-title">Remove calendar connection?</h4>
            <p className="hc-sync-remove-modal-copy">
              This will disconnect <strong>{pendingRemoveSourceName}</strong> from this accommodation.
            </p>
            <p className="hc-sync-remove-modal-copy">
              You can re-add it later, but imported blocked dates from this source will stop syncing.
            </p>
          </>
        )}

        {addCalendarError ? <p className="hc-sync-error">{addCalendarError}</p> : null}

        <div className="hc-sync-remove-modal-actions">
          <button
            type="button"
            className="hc-sync-cancel-btn"
            disabled={isRemovingPendingSource}
            onClick={() => {
              if (!isRemoveReasonStep) {
                setRemoveSourceFlowStep(REMOVE_SOURCE_FLOW_STEP.REASON);
                return;
              }
              resetRemoveSourceFlow();
            }}
          >
            {isRemoveReasonStep ? "Cancel" : "Back"}
          </button>
          <button
            type="button"
            className="hc-sync-remove-confirm-btn"
            disabled={isRemovingPendingSource || (isRemoveReasonStep && !hasSelectedRemoveReason)}
            onClick={isRemoveReasonStep ? handleRemoveReasonsNext : handleConfirmRemoveSource}
          >
            {removeConfirmButtonLabel}
          </button>
        </div>
      </section>
    </dialog>
  );
}

RemoveSourceModal.propTypes = {
  isOpen: PropTypes.bool,
  isRemovingPendingSource: PropTypes.bool,
  isRemoveReasonStep: PropTypes.bool,
  selectedRemoveReasonIdSet: PropTypes.instanceOf(Set),
  handleToggleRemoveReason: PropTypes.func,
  pendingRemoveSourceName: PropTypes.string,
  addCalendarError: PropTypes.string,
  resetRemoveSourceFlow: PropTypes.func,
  setRemoveSourceFlowStep: PropTypes.func,
  handleRemoveReasonsNext: PropTypes.func,
  handleConfirmRemoveSource: PropTypes.func,
  removeConfirmButtonLabel: PropTypes.string,
  hasSelectedRemoveReason: PropTypes.bool,
};
