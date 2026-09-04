import React from "react";
import PropTypes from "prop-types";
import styles from "./QuoteAvailabilitySection.module.scss";

export default function GuestCountField({ value, onChange, min = 1, max = null, disabled = false, errorMessage = "" }) {
  const hasMax = Number.isInteger(max) && max > 0;
  const canDecrement = !disabled && value > min;
  const canIncrement = !disabled && (!hasMax || value < max);

  return (
    <div className={styles.guestField}>
      <div className={styles.guestFieldHeader}>
        <span id="website-quote-guests-label" className={styles.fieldLabel}>
          Guests
        </span>
        {hasMax ? <span className={styles.hint}>{`Up to ${max} guests`}</span> : null}
      </div>
      <div className={styles.stepper} role="group" aria-labelledby="website-quote-guests-label">
        <button
          type="button"
          className={styles.stepperButton}
          aria-label="Remove a guest"
          disabled={!canDecrement}
          onClick={() => onChange(value - 1)}
        >
          −
        </button>
        <span className={styles.stepperValue} aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          className={styles.stepperButton}
          aria-label="Add a guest"
          disabled={!canIncrement}
          onClick={() => onChange(value + 1)}
        >
          +
        </button>
      </div>
      {errorMessage ? (
        <p className={styles.fieldError} role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

GuestCountField.propTypes = {
  value: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  min: PropTypes.number,
  max: PropTypes.number,
  disabled: PropTypes.bool,
  errorMessage: PropTypes.string,
};
