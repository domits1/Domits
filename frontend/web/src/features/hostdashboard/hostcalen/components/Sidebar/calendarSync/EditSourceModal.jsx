import React from "react";
import PropTypes from "prop-types";
import { useDismissOnOutsideMouseDown, useShowModalEffect } from "./calendarSyncHooks";
import CalendarSourceFields from "./CalendarSourceFields";

export default function EditSourceModal({
  isOpen,
  addingCalendar,
  onCancelEdit,
  externalCalendarUrlInput,
  onExternalCalendarUrlChange,
  calendarNameInput,
  onCalendarNameChange,
  calendarProviderInput,
  onCalendarProviderChange,
  addCalendarError,
  canAddCalendar,
  onAddCalendar,
}) {
  const dialogRef = React.useRef(null);
  const modalContentRef = React.useRef(null);

  useShowModalEffect(isOpen, dialogRef);

  const handleDismiss = React.useCallback(() => {
    if (!addingCalendar) {
      onCancelEdit?.();
    }
  }, [addingCalendar, onCancelEdit]);

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
      className="hc-sync-edit-modal-backdrop"
      aria-label="Edit calendar connection"
      onCancel={(event) => {
        event.preventDefault();
        handleDismiss();
      }}
    >
      <section ref={modalContentRef} className="hc-sync-edit-modal">
        <h4 className="hc-sync-edit-modal-title">Edit calendar connection</h4>
        <p className="hc-sync-edit-modal-copy">Update the link, name, or provider and save changes.</p>

        <CalendarSourceFields
          externalCalendarUrlInput={externalCalendarUrlInput}
          onExternalCalendarUrlChange={onExternalCalendarUrlChange}
          calendarNameInput={calendarNameInput}
          onCalendarNameChange={onCalendarNameChange}
          calendarProviderInput={calendarProviderInput}
          onCalendarProviderChange={onCalendarProviderChange}
        />

        {addCalendarError ? <p className="hc-sync-error">{addCalendarError}</p> : null}

        <div className="hc-sync-edit-modal-actions">
          <button
            type="button"
            className="hc-sync-cancel-btn"
            disabled={addingCalendar}
            onClick={() => onCancelEdit?.()}
          >
            Cancel
          </button>
          <button
            type="button"
            className="hc-sync-add-btn"
            disabled={!canAddCalendar}
            onClick={() => onAddCalendar?.()}
          >
            {addingCalendar ? "Saving..." : "Save changes"}
          </button>
        </div>
      </section>
    </dialog>
  );
}

EditSourceModal.propTypes = {
  isOpen: PropTypes.bool,
  addingCalendar: PropTypes.bool,
  onCancelEdit: PropTypes.func,
  externalCalendarUrlInput: PropTypes.string,
  onExternalCalendarUrlChange: PropTypes.func,
  calendarNameInput: PropTypes.string,
  onCalendarNameChange: PropTypes.func,
  calendarProviderInput: PropTypes.string,
  onCalendarProviderChange: PropTypes.func,
  addCalendarError: PropTypes.string,
  canAddCalendar: PropTypes.bool,
  onAddCalendar: PropTypes.func,
};
