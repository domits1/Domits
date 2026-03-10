import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import ClipLoader from "react-spinners/ClipLoader";
import styles from "../../HostProperty.module.css";
import { TABS } from "../constants";

const hostPropertyOptionShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  title: PropTypes.string,
  status: PropTypes.string,
});

const deleteReasonShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
});

const PROPERTY_STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Live" },
  { value: "INACTIVE", label: "Draft" },
  { value: "ARCHIVED", label: "Archived" },
];

const resolveStatusDotClass = (status) => {
  if (status === "ACTIVE") {
    return styles.statusDotLive;
  }
  if (status === "ARCHIVED") {
    return styles.statusDotArchived;
  }
  return styles.statusDotDraft;
};

function HostPropertyStatusDropdown({ status, onStatusChange, saving }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const normalizedStatus = String(status || "INACTIVE").toUpperCase();
  const selectedOption = PROPERTY_STATUS_OPTIONS.find((option) => option.value === normalizedStatus) || PROPERTY_STATUS_OPTIONS[0];

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    const handleEscapePress = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscapePress);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscapePress);
    };
  }, [menuOpen]);

  const toggleMenu = () => {
    if (saving) {
      return;
    }
    setMenuOpen((previous) => !previous);
  };

  const handleOptionSelect = (nextStatus) => {
    setMenuOpen(false);
    if (nextStatus === normalizedStatus) {
      return;
    }
    onStatusChange(nextStatus);
  };

  return (
    <div className={styles.listingStatusControl} ref={dropdownRef}>
      <button
        type="button"
        className={styles.listingStatusTrigger}
        onClick={toggleMenu}
        disabled={saving}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label="Listing status"
      >
        <span className={styles.listingStatusValue}>{selectedOption.label}</span>
        <span className={styles.listingStatusIndicators}>
          <span className={`${styles.statusDot} ${resolveStatusDotClass(normalizedStatus)}`} />
          <span className={styles.listingStatusChevron} aria-hidden="true">
            {menuOpen ? "\u25B2" : "\u25BE"}
          </span>
        </span>
      </button>
      {menuOpen ? (
        <ul className={styles.listingStatusMenu} aria-label="Select listing status">
          {PROPERTY_STATUS_OPTIONS.map((option) => {
            const isSelected = option.value === normalizedStatus;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  className={`${styles.listingStatusOption} ${isSelected ? styles.listingStatusOptionActive : ""}`}
                  onClick={() => handleOptionSelect(option.value)}
                  disabled={saving}
                >
                  <span className={styles.listingStatusOptionLabel}>{option.label}</span>
                  <span className={`${styles.statusDot} ${resolveStatusDotClass(option.value)}`} />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

HostPropertyStatusDropdown.propTypes = {
  status: PropTypes.string.isRequired,
  onStatusChange: PropTypes.func.isRequired,
  saving: PropTypes.bool.isRequired,
};

export function HostPropertyLoadingView() {
  return (
    <main className="page-Host">
      <p className="page-Host-title">Listing editor</p>
      <div className="page-Host-content">
        <section className={`host-pc-dashboard ${styles.editorShell}`}>
          <div className={styles.loaderWrap}>
            <ClipLoader size={80} color="#0D9813" loading />
            <p className={styles.loaderText}>Loading property details...</p>
          </div>
        </section>
      </div>
    </main>
  );
}

export function HostPropertyUnsavedChangesModal({ open, onStay, onLeave }) {
  if (!open) {
    return null;
  }

  return (
    <dialog
      open
      className={styles.unsavedModalOverlay}
      aria-labelledby="unsaved-modal-title"
      onCancel={(event) => {
        event.preventDefault();
        onStay();
      }}
    >
      <section className={styles.unsavedModal}>
        <h4 id="unsaved-modal-title" className={styles.unsavedModalTitle}>
          You have unsaved changes
        </h4>
        <p className={styles.unsavedModalDescription}>
          If you leave now, your unsaved edits will be lost.
        </p>
        <div className={styles.unsavedModalActions}>
          <button type="button" className={styles.unsavedStayButton} onClick={onStay}>
            Stay
          </button>
          <button type="button" className={styles.unsavedLeaveButton} onClick={onLeave}>
            Leave
          </button>
        </div>
      </section>
    </dialog>
  );
}

export function HostPropertyDeleteReasonsModal({
  open,
  reasons,
  selectedReasonIds,
  onToggleReason,
  onClose,
  onNext,
  submitting = false,
}) {
  if (!open) {
    return null;
  }

  const selectedReasonIdSet = new Set(selectedReasonIds);
  const hasSelectedReason = selectedReasonIdSet.size > 0;

  return (
    <dialog
      open
      className={styles.deletePropertyReasonsOverlay}
      aria-labelledby="delete-property-reasons-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <section className={styles.deletePropertyReasonsModal}>
        <div className={styles.deletePropertyReasonsHeader}>
          <h4 id="delete-property-reasons-title" className={styles.deletePropertyReasonsTitle}>
            Let us know why you&apos;re deleting this property
          </h4>
          <button
            type="button"
            className={styles.deletePropertyReasonsCloseButton}
            onClick={onClose}
            aria-label="Close"
            disabled={submitting}
          >
            x
          </button>
        </div>

        <p className={styles.deletePropertyReasonsSubtitle}>Choose all that apply.</p>

        <div className={styles.deletePropertyReasonsList}>
          {reasons.map((reason) => {
            const isChecked = selectedReasonIdSet.has(reason.id);
            return (
              <label key={reason.id} className={styles.deletePropertyReasonRow}>
                <input
                  type="checkbox"
                  className={styles.deletePropertyReasonCheckbox}
                  checked={isChecked}
                  onChange={() => onToggleReason(reason.id)}
                  disabled={submitting}
                />
                <span>{reason.label}</span>
              </label>
            );
          })}
        </div>

        <div className={styles.deletePropertyReasonsActions}>
          <button
            type="button"
            className={styles.deletePropertyReasonsCancelButton}
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.deletePropertyReasonsNextButton}
            onClick={onNext}
            disabled={submitting || !hasSelectedReason}
          >
            Next
          </button>
        </div>
      </section>
    </dialog>
  );
}

export function HostPropertyDeleteConfirmModal({ open, onBack, onCancel, onConfirm, submitting = false }) {
  if (!open) {
    return null;
  }

  return (
    <dialog
      open
      className={styles.deletePropertyConfirmOverlay}
      aria-labelledby="delete-property-confirm-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <section className={styles.deletePropertyConfirmModal}>
        <button
          type="button"
          className={styles.deletePropertyConfirmBackButton}
          onClick={onBack}
          aria-label="Back"
          disabled={submitting}
        >
          Back
        </button>

        <h4 id="delete-property-confirm-title" className={styles.deletePropertyConfirmTitle}>
          Remove this listing?
        </h4>
        <p className={styles.deletePropertyConfirmDescription}>
          This is permanent - you will no longer be able to find or edit this listing.
        </p>

        <div className={styles.deletePropertyConfirmActions}>
          <button
            type="button"
            className={styles.deletePropertyConfirmRemoveButton}
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? "Removing..." : "Yes, remove"}
          </button>
          <button
            type="button"
            className={styles.deletePropertyConfirmCancelButton}
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
        </div>
      </section>
    </dialog>
  );
}

export function HostPropertyTabs({ selectedTab, onSelectTab, saving }) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="Listing editor tabs">
      {TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          className={`${styles.tab} ${selectedTab === tab ? styles.tabActive : ""}`}
          onClick={() => onSelectTab(tab)}
          aria-selected={selectedTab === tab}
          disabled={saving}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

export function HostPropertyListingSummary({
  propertyId,
  hostProperties,
  title,
  status,
  onPropertyChange,
  onStatusChange,
  saving,
}) {
  return (
    <article className={styles.listingSummary}>
      <select
        id="listing-selector"
        value={propertyId || ""}
        onChange={onPropertyChange}
        className={styles.listingSelect}
        disabled={saving}
      >
        {hostProperties.length > 0 ? (
          hostProperties.map((accommodation) => (
            <option key={accommodation.id} value={accommodation.id}>
              {accommodation.title}
            </option>
          ))
        ) : (
          <option value={propertyId || ""}>{title || "Untitled listing"}</option>
        )}
      </select>
      <HostPropertyStatusDropdown
        status={status}
        onStatusChange={onStatusChange}
        saving={saving}
      />
    </article>
  );
}

export function HostPropertyPlaceholderTab({ selectedTab }) {
  return (
    <section className={`${styles.card} ${styles.placeholderCard}`}>
      <p className={styles.placeholderBadge}>Coming soon</p>
      <h3 className={styles.sectionTitle}>{selectedTab}</h3>
      <p className={styles.placeholderText}>
        Editing for {selectedTab.toLowerCase()} is not available yet. We will enable this tab in a next rollout.
      </p>
    </section>
  );
}

export function HostPropertyActions({ onBack, onSave, saving, saveEnabled }) {
  const saveButtonLabel = saveEnabled && saving ? "Saving..." : "Save changes";
  return (
    <div className={styles.actions}>
      <button className={styles.actionButton} onClick={onBack} disabled={saving}>
        Back to listings
      </button>
      <button className={styles.actionButton} onClick={onSave} disabled={saving || !saveEnabled}>
        {saveButtonLabel}
      </button>
    </div>
  );
}

HostPropertyUnsavedChangesModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onStay: PropTypes.func.isRequired,
  onLeave: PropTypes.func.isRequired,
};

HostPropertyDeleteReasonsModal.propTypes = {
  open: PropTypes.bool.isRequired,
  reasons: PropTypes.arrayOf(deleteReasonShape).isRequired,
  selectedReasonIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  onToggleReason: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
};

HostPropertyDeleteConfirmModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onBack: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
};

HostPropertyTabs.propTypes = {
  selectedTab: PropTypes.string.isRequired,
  onSelectTab: PropTypes.func.isRequired,
  saving: PropTypes.bool.isRequired,
};

HostPropertyListingSummary.propTypes = {
  propertyId: PropTypes.string.isRequired,
  hostProperties: PropTypes.arrayOf(hostPropertyOptionShape).isRequired,
  title: PropTypes.string.isRequired,
  status: PropTypes.string.isRequired,
  onPropertyChange: PropTypes.func.isRequired,
  onStatusChange: PropTypes.func.isRequired,
  saving: PropTypes.bool.isRequired,
};

HostPropertyPlaceholderTab.propTypes = {
  selectedTab: PropTypes.string.isRequired,
};

HostPropertyActions.propTypes = {
  onBack: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  saving: PropTypes.bool.isRequired,
  saveEnabled: PropTypes.bool.isRequired,
};

