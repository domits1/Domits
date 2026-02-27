import React from "react";
import arrowLeftIcon from "../../../../../images/arrow-left-icon.svg";

const ADVANCE_NOTICE_OPTIONS = [0, 1, 2, 3, 5, 7, 14, 30];
const PREPARATION_TIME_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7];
const ADVANCE_NOTICE_HELP =
  "Guests can only book if check-in is at least this many days away.";
const PREPARATION_TIME_HELP =
  "Blocks a buffer between bookings so you have time to prepare the accommodation.";
const AVAILABILITY_WINDOW_HELP =
  "Defines how far into the future guests can make new bookings.";
const MINIMUM_NIGHTS_HELP =
  "Guests must book at least this many nights for a reservation.";
const MAXIMUM_NIGHTS_HELP =
  "Maximum nights a guest can book in one reservation. Set 0 for no maximum.";

const toDayLabel = (value) => {
  const days = Math.max(0, Number(value) || 0);
  if (days === 0) {
    return "Same day";
  }
  if (days === 1) {
    return "1 day";
  }
  return `${days} days`;
};

export default function AvailabilitySettingsCard({
  minimumStayInput,
  maximumStayInput,
  advanceNoticeDaysInput,
  preparationTimeDaysInput,
  availabilityWindowDaysInput,
  availabilityWindowOptions,
  onMinimumStayChange,
  onMaximumStayChange,
  onAdvanceNoticeChange,
  onPreparationTimeChange,
  onAvailabilityWindowChange,
  showSaveButton,
  canSave,
  saving,
  saveError,
  onSave,
  onBack,
}) {
  const windowOptions = Array.isArray(availabilityWindowOptions)
    ? availabilityWindowOptions
    : [];

  return (
    <section className="hc-availability-settings-card" aria-label="Availability settings">
      <header className="hc-availability-settings-header">
        <button
          type="button"
          className="hc-availability-settings-back"
          onClick={() => onBack?.()}
          aria-label="Back to summary"
        >
          <img src={arrowLeftIcon} alt="" aria-hidden="true" className="hc-chevron-icon" />
        </button>
      </header>

      <h3 className="hc-availability-settings-title">Availability settings</h3>
      <p className="hc-availability-settings-copy">
        These apply to all nights, unless you customize them by date.
      </p>

      <form
        className="hc-availability-settings-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (canSave) {
            onSave?.();
          }
        }}
      >
        <section className="hc-availability-settings-section">
          <h4 className="hc-availability-settings-section-title">Stay duration</h4>

          <article className="hc-availability-settings-item" title={MINIMUM_NIGHTS_HELP}>
            <label className="hc-availability-settings-item-label" htmlFor="hc-availability-min-stay">
              Minimum nights
            </label>
            <input
              id="hc-availability-min-stay"
              type="number"
              min="1"
              step="1"
              className="hc-availability-settings-input"
              value={minimumStayInput}
              onChange={(event) => onMinimumStayChange?.(event.target.value)}
            />
          </article>

          <article className="hc-availability-settings-item" title={MAXIMUM_NIGHTS_HELP}>
            <label className="hc-availability-settings-item-label" htmlFor="hc-availability-max-stay">
              Maximum nights
            </label>
            <input
              id="hc-availability-max-stay"
              type="number"
              min="0"
              step="1"
              className="hc-availability-settings-input"
              value={maximumStayInput}
              onChange={(event) => onMaximumStayChange?.(event.target.value)}
            />
          </article>
        </section>

        <section className="hc-availability-settings-section">
          <h4 className="hc-availability-settings-section-title">Availability</h4>

          <article className="hc-availability-settings-item" title={ADVANCE_NOTICE_HELP}>
            <label className="hc-availability-settings-item-label" htmlFor="hc-availability-advance-notice">
              Advance notice
            </label>
            <select
              id="hc-availability-advance-notice"
              className="hc-availability-settings-select"
              value={advanceNoticeDaysInput}
              onChange={(event) => onAdvanceNoticeChange?.(event.target.value)}
            >
              {ADVANCE_NOTICE_OPTIONS.map((optionValue) => (
                <option key={optionValue} value={optionValue}>
                  {toDayLabel(optionValue)}
                </option>
              ))}
            </select>
          </article>

          <article className="hc-availability-settings-item" title={PREPARATION_TIME_HELP}>
            <label className="hc-availability-settings-item-label" htmlFor="hc-availability-preparation-time">
              Preparation time
            </label>
            <select
              id="hc-availability-preparation-time"
              className="hc-availability-settings-select"
              value={preparationTimeDaysInput}
              onChange={(event) => onPreparationTimeChange?.(event.target.value)}
            >
              {PREPARATION_TIME_OPTIONS.map((optionValue) => (
                <option key={optionValue} value={optionValue}>
                  {toDayLabel(optionValue)}
                </option>
              ))}
            </select>
          </article>

          <article className="hc-availability-settings-item" title={AVAILABILITY_WINDOW_HELP}>
            <label className="hc-availability-settings-item-label" htmlFor="hc-availability-window">
              Availability window
            </label>
            <select
              id="hc-availability-window"
              className="hc-availability-settings-select"
              value={availabilityWindowDaysInput}
              onChange={(event) => onAvailabilityWindowChange?.(event.target.value)}
            >
              {windowOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </article>
        </section>

        {saveError ? <p className="hc-availability-settings-error">{saveError}</p> : null}

        {showSaveButton ? (
          <button type="submit" className="hc-availability-settings-save-btn" disabled={!canSave}>
            {saving ? "Saving..." : "Save"}
          </button>
        ) : null}
      </form>
    </section>
  );
}
