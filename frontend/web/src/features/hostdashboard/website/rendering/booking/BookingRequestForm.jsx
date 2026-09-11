import React, { useId } from "react";
import PropTypes from "prop-types";
import styles from "./QuoteAvailabilitySection.module.scss";

function ContactField({ id, label, type, autoComplete, value, error, disabled, onChange }) {
  const errorId = `${id}-error`;

  return (
    <div className={styles.formField}>
      <label htmlFor={id} className={styles.fieldLabel}>
        {label}
      </label>
      <input
        id={id}
        className={`${styles.input} ${error ? styles.inputInvalid : ""}`.trim()}
        type={type}
        autoComplete={autoComplete}
        value={value}
        disabled={disabled}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <p id={errorId} className={styles.fieldError}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

ContactField.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  autoComplete: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  error: PropTypes.string,
  disabled: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default function BookingRequestForm({
  guest,
  onGuestChange,
  onSubmit,
  isSubmitting = false,
  fieldErrors = {},
  formError = "",
}) {
  const fieldIdPrefix = useId();

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}>
      <ContactField
        id={`${fieldIdPrefix}-name`}
        label="Your name"
        type="text"
        autoComplete="name"
        value={guest?.name || ""}
        error={fieldErrors?.name || ""}
        disabled={isSubmitting}
        onChange={(value) => onGuestChange("name", value)}
      />
      <ContactField
        id={`${fieldIdPrefix}-email`}
        label="Email address"
        type="email"
        autoComplete="email"
        value={guest?.email || ""}
        error={fieldErrors?.email || ""}
        disabled={isSubmitting}
        onChange={(value) => onGuestChange("email", value)}
      />
      {formError ? (
        <p className={styles.fieldError} role="alert">
          {formError}
        </p>
      ) : null}
      <button type="submit" className={styles.action} disabled={isSubmitting}>
        {isSubmitting ? "Sending…" : "Request to book"}
      </button>
      <p className={styles.hint}>Nothing is booked until the host confirms your request.</p>
    </form>
  );
}

BookingRequestForm.propTypes = {
  guest: PropTypes.shape({
    name: PropTypes.string,
    email: PropTypes.string,
  }).isRequired,
  onGuestChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool,
  fieldErrors: PropTypes.shape({
    name: PropTypes.string,
    email: PropTypes.string,
  }),
  formError: PropTypes.string,
};
