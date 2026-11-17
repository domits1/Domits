import React, { useEffect, useId, useRef, useState } from "react";
import PropTypes from "prop-types";
import styles from "./eliteContactForm.module.scss";
import { cleanContactValues, findContactFieldErrors } from "./eliteContactContent";
import { CONTACT_TEXTS, sendWebsiteContactMessage } from "../../../services/websitePublicContactService";

export const CONTACT_REQUEST_TIMEOUT_MS = 35000;
export const CONTACT_RESEND_PAUSE_MS = 1000;

const EMPTY_VALUES = Object.freeze({ name: "", email: "", phone: "", message: "", propertyId: "" });
const GUEST_FIELDS = Object.freeze([
  { field: "name", label: "Name", type: "text", autoComplete: "name" },
  { field: "email", label: "Email", type: "email", autoComplete: "email" },
  { field: "phone", label: "Phone (optional)", type: "tel", autoComplete: "tel" },
]);

const contactPropertyPropType = PropTypes.shape({ propertyId: PropTypes.string, title: PropTypes.string });

export const eliteContactContextPropType = PropTypes.shape({
  siteId: PropTypes.string.isRequired,
  properties: PropTypes.arrayOf(contactPropertyPropType.isRequired).isRequired,
});

export default function EliteContactForm({ contactContext }) {
  const idPrefix = useId();
  const [values, setValues] = useState(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const isSendingRef = useRef(false);
  const requestRef = useRef(null);
  const answeredAtRef = useRef(Number.NEGATIVE_INFINITY);
  const { properties } = contactContext;
  const hasPicker = properties.length > 0;

  useEffect(() => () => requestRef.current?.abort(), []);

  const controlProps = (field) => ({
    id: `${idPrefix}-${field}`,
    name: field,
    value: values[field],
    disabled: isSending,
    className: `${styles.eliteContactInput} ${fieldErrors[field] ? styles.eliteContactInputInvalid : ""}`.trim(),
    "aria-invalid": fieldErrors[field] ? "true" : undefined,
    "aria-describedby": fieldErrors[field] ? `${idPrefix}-${field}-error` : undefined,
    onChange: (event) => setValues((current) => ({ ...current, [field]: event.target.value })),
  });

  const renderField = (field, label, control) => (
    <div key={field} className={styles.eliteContactField}>
      <label htmlFor={`${idPrefix}-${field}`}>{label}</label>
      {control}
      {fieldErrors[field] ? (
        <p id={`${idPrefix}-${field}-error`} className={styles.eliteContactFieldError}>
          {fieldErrors[field]}
        </p>
      ) : null}
    </div>
  );

  const showAnswer = (answer) => {
    if (answer.isSent) {
      setValues(EMPTY_VALUES);
    } else if (answer.field) {
      setFieldErrors({ [answer.field]: answer.text });
    }
    setNotice({ isError: !answer.isSent, text: answer.field ? CONTACT_TEXTS.checkFields : answer.text });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSendingRef.current || Date.now() - answeredAtRef.current < CONTACT_RESEND_PAUSE_MS) {
      return;
    }

    const cleanValues = cleanContactValues(values);
    const propertyId = hasPicker ? values.propertyId : "";
    const errors = findContactFieldErrors(cleanValues);
    if (propertyId && !properties.some((property) => property.propertyId === propertyId)) {
      errors.propertyId = CONTACT_TEXTS.propertyGone;
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setNotice({ isError: true, text: CONTACT_TEXTS.checkFields });
      return;
    }

    isSendingRef.current = true;
    setIsSending(true);
    setNotice(null);
    const request = new AbortController();
    requestRef.current = request;
    const timer = globalThis.setTimeout(() => request.abort(), CONTACT_REQUEST_TIMEOUT_MS);
    const message = { siteId: contactContext.siteId, propertyId, ...cleanValues };
    const answer = await sendWebsiteContactMessage(message, request.signal);
    globalThis.clearTimeout(timer);
    answeredAtRef.current = Date.now();
    isSendingRef.current = false;
    setIsSending(false);
    showAnswer(answer);
  };

  return (
    <section className={styles.eliteContactFormSection} aria-labelledby={`${idPrefix}-title`}>
      <form className={styles.eliteContactForm} noValidate onSubmit={handleSubmit}>
        <h2 id={`${idPrefix}-title`} className={styles.eliteContactFormTitle}>
          Send a message
        </h2>
        <div className={styles.eliteContactFieldGrid}>
          {GUEST_FIELDS.map(({ field, label, type, autoComplete }) =>
            renderField(field, label, <input type={type} autoComplete={autoComplete} {...controlProps(field)} />)
          )}
        </div>
        {hasPicker
          ? renderField(
              "propertyId",
              "Which property is it about?",
              <select {...controlProps("propertyId")}>
                <option value="">A general question</option>
                {properties.map((property) => (
                  <option key={property.propertyId} value={property.propertyId}>
                    {property.title}
                  </option>
                ))}
              </select>
            )
          : null}
        {renderField("message", "Message", <textarea rows={6} {...controlProps("message")} />)}
        {notice ? (
          <p
            role={notice.isError ? "alert" : "status"}
            className={`${styles.eliteContactNotice} ${notice.isError ? styles.eliteContactNoticeError : ""}`.trim()}>
            {notice.text}
          </p>
        ) : null}
        <button type="submit" className={styles.eliteContactButton} disabled={isSending}>
          {isSending ? "Sending..." : "Send message"}
        </button>
      </form>
    </section>
  );
}

EliteContactForm.propTypes = {
  contactContext: eliteContactContextPropType.isRequired,
};
