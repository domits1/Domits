import React, { useId } from "react";
import PropTypes from "prop-types";
import styles from "./eliteSitePage.module.scss";
import requestStyles from "./eliteSitePropertyRequest.module.scss";
import quoteStyles from "../../booking/QuoteAvailabilitySection.module.scss";

const CONTACT_FIELDS = Object.freeze([
  { field: "firstName", label: "First name", autoComplete: "given-name" },
  { field: "lastName", label: "Last name", autoComplete: "family-name" },
  { field: "email", label: "Email address", type: "email", autoComplete: "email" },
  { field: "phone", label: "Phone (optional)", type: "tel", autoComplete: "tel" },
]);
const MESSAGE_FIELD = Object.freeze({
  field: "message",
  label: "Message to the host (optional)",
  as: "textarea",
  rows: 5,
  placeholder: "Who is coming, when you arrive, any questions.",
});

export default function EliteSitePropertyRequestForm({
  details,
  onChange,
  onSubmit,
  houseRules,
  isSubmitting,
  fieldErrors,
  formError,
}) {
  const idPrefix = useId();
  const describe = (field) => (fieldErrors[field] ? `${idPrefix}-${field}-error` : undefined);
  const renderError = (field) =>
    fieldErrors[field] ? (
      <p id={describe(field)} className={quoteStyles.fieldError}>
        {fieldErrors[field]}
      </p>
    ) : null;

  const renderField = ({ field, label, as: Control = "input", type = "text", ...controlProps }) => (
    <div key={field} className={quoteStyles.formField}>
      <label htmlFor={`${idPrefix}-${field}`} className={quoteStyles.fieldLabel}>
        {label}
      </label>
      <Control
        {...controlProps}
        id={`${idPrefix}-${field}`}
        type={Control === "input" ? type : undefined}
        className={`${quoteStyles.input} ${fieldErrors[field] ? quoteStyles.inputInvalid : ""}`.trim()}
        value={details[field]}
        disabled={isSubmitting}
        aria-invalid={fieldErrors[field] ? "true" : undefined}
        aria-describedby={describe(field)}
        onChange={(event) => onChange(field, event.target.value)}
      />
      {renderError(field)}
    </div>
  );

  return (
    <form
      className={requestStyles.form}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}>
      <div className={requestStyles.fields}>{CONTACT_FIELDS.map(renderField)}</div>
      {renderField(MESSAGE_FIELD)}
      {houseRules.length > 0 ? (
        <fieldset className={requestStyles.houseRules}>
          <legend>House rules</legend>
          <ul>
            {houseRules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
          <label className={requestStyles.accept}>
            <input
              type="checkbox"
              checked={details.acceptsHouseRules}
              disabled={isSubmitting}
              aria-invalid={fieldErrors.acceptsHouseRules ? "true" : undefined}
              aria-describedby={describe("acceptsHouseRules")}
              onChange={(event) => onChange("acceptsHouseRules", event.target.checked)}
            />
            <span>I have read the house rules and accept them.</span>
          </label>
          {renderError("acceptsHouseRules")}
        </fieldset>
      ) : null}
      {formError ? (
        <p className={quoteStyles.fieldError} role="alert">
          {formError}
        </p>
      ) : null}
      <button type="submit" className={`${styles.eliteButton} ${requestStyles.sendButton}`} disabled={isSubmitting}>
        {isSubmitting ? "Sending…" : "Request to book"}
      </button>
      <p className={styles.elitePriceNote}>You don&apos;t pay yet. The host confirms first.</p>
    </form>
  );
}

EliteSitePropertyRequestForm.propTypes = {
  details: PropTypes.shape({
    firstName: PropTypes.string.isRequired,
    lastName: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
    phone: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    acceptsHouseRules: PropTypes.bool.isRequired,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  houseRules: PropTypes.arrayOf(PropTypes.string).isRequired,
  isSubmitting: PropTypes.bool.isRequired,
  fieldErrors: PropTypes.objectOf(PropTypes.string).isRequired,
  formError: PropTypes.string.isRequired,
};
