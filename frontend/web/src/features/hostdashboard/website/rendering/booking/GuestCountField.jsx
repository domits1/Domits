import React from "react";
import PropTypes from "prop-types";
import styles from "./QuoteAvailabilitySection.module.scss";

export default function GuestCountField({ value, onChange, min = 1, max = null, disabled = false, errorMessage = "" }) {
  const hasMax = Number.isInteger(max) && max > 0;
  const canDecrement = !disabled && value > min;
  const canIncrement = !disabled && (!hasMax || value < max);

  return (
    <fieldset className={styles.guestField}>
      <legend className={styles.guestFieldLegend}>
        <span className={styles.fieldLabel}>Guests</span>
        {hasMax ? <span className={styles.hint}>{`Up to ${max} guests`}</span> : null}
      </legend>
      <div className={styles.stepper}>
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
    </fieldset>
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
