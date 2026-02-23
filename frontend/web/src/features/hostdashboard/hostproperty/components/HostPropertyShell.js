import React from "react";
import PropTypes from "prop-types";
import ClipLoader from "react-spinners/ClipLoader";
import styles from "../../HostProperty.module.css";
import { TABS } from "../constants";

const hostPropertyOptionShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  title: PropTypes.string,
  status: PropTypes.string,
});

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
  statusLabel,
  statusDotClass,
  onPropertyChange,
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
      <p className={styles.listingStatus}>
        <span className={`${styles.statusDot} ${statusDotClass}`} />
        {statusLabel}
      </p>
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

HostPropertyTabs.propTypes = {
  selectedTab: PropTypes.string.isRequired,
  onSelectTab: PropTypes.func.isRequired,
  saving: PropTypes.bool.isRequired,
};

HostPropertyListingSummary.propTypes = {
  propertyId: PropTypes.string.isRequired,
  hostProperties: PropTypes.arrayOf(hostPropertyOptionShape).isRequired,
  title: PropTypes.string.isRequired,
  statusLabel: PropTypes.string.isRequired,
  statusDotClass: PropTypes.string.isRequired,
  onPropertyChange: PropTypes.func.isRequired,
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