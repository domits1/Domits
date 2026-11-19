import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { createOwner, updateOwner } from "../services/ownerService";
import {
  ARCHIVED_OWNER_STATUS,
  OWNER_FIELD_MAX_LENGTHS,
  OWNER_FORM_FIELDS,
  OWNER_TYPES,
  SETTABLE_OWNER_STATUSES,
  buildCreatePayload,
  buildCreateRecord,
  buildUpdateChanges,
  emptyFormValues,
  isFieldShown,
  toFormValues,
  validateOwnerChanges,
} from "../utils/ownerFormRules";
import { fillTemplate, saveErrorText } from "../utils/ownerText";

const FIELD_ID_PREFIX = "host-owners-form";
const TITLE_ID = `${FIELD_ID_PREFIX}-title`;
const NOTES_ROWS = 4;

const FIELD_INPUT_TYPES = Object.freeze({
  first_name: { type: "text", autoComplete: "given-name" },
  last_name: { type: "text", autoComplete: "family-name" },
  company_name: { type: "text", autoComplete: "organization" },
  email: { type: "email", autoComplete: "email" },
  phone: { type: "tel", autoComplete: "tel" },
  preferred_language: { type: "text", autoComplete: "off" },
});

const fieldId = (field) => `${FIELD_ID_PREFIX}-${field}`;

const OwnerFormModal = ({ owner, t, onClose, onSaved }) => {
  const isEdit = Boolean(owner);
  const texts = t.form;
  const [values, setValues] = useState(() => (isEdit ? toFormValues(owner) : emptyFormValues()));
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const fieldRefs = useRef({});

  const changes = isEdit ? buildUpdateChanges(values, owner) : null;
  const canSave = !isEdit || Object.keys(changes).length > 0;
  const showArchivedOption = owner?.status === ARCHIVED_OWNER_STATUS;

  useEffect(() => {
    fieldRefs.current.first_name?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isSaving) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSaving, onClose]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => Object.fromEntries(Object.entries(previous).filter(([field]) => field !== name)));
  };

  const save = () => (isEdit ? updateOwner(owner.id, changes) : createOwner(buildCreatePayload(values)));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSaving || !canSave) {
      return;
    }
    const record = isEdit ? changes : buildCreateRecord(values);
    const nextErrors = validateOwnerChanges(record, isEdit ? owner : {});
    setErrors(nextErrors);
    const firstInvalidField = OWNER_FORM_FIELDS.find((field) => nextErrors[field]);
    if (firstInvalidField) {
      fieldRefs.current[firstInvalidField]?.focus();
      return;
    }
    setServerError(null);
    setIsSaving(true);
    try {
      const saved = await save();
      onSaved(saved);
    } catch (error) {
      setServerError(saveErrorText(error, t));
      setIsSaving(false);
    }
  };

  const errorText = (field) => fillTemplate(texts.errors[errors[field]], { max: OWNER_FIELD_MAX_LENGTHS[field] });

  const fieldProps = (field) => {
    const hasError = Boolean(errors[field]);
    return {
      id: fieldId(field),
      name: field,
      value: values[field],
      onChange: handleChange,
      ref: (element) => {
        fieldRefs.current[field] = element;
      },
      "aria-invalid": hasError,
      "aria-describedby": hasError ? `${fieldId(field)}-error` : undefined,
    };
  };

  const renderControl = (field) => {
    if (field === "owner_type") {
      return (
        <select {...fieldProps(field)}>
          <option value="" disabled>
            {texts.chooseOwnerType}
          </option>
          {OWNER_TYPES.map((type) => (
            <option key={type} value={type}>
              {t.ownerTypes[type]}
            </option>
          ))}
        </select>
      );
    }
    if (field === "status") {
      return (
        <select {...fieldProps(field)}>
          {showArchivedOption ? (
            <option value={ARCHIVED_OWNER_STATUS} disabled>
              {t.statuses[ARCHIVED_OWNER_STATUS]}
            </option>
          ) : null}
          {SETTABLE_OWNER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {t.statuses[status]}
            </option>
          ))}
        </select>
      );
    }
    if (field === "notes") {
      return <textarea {...fieldProps(field)} rows={NOTES_ROWS} />;
    }
    const { type, autoComplete } = FIELD_INPUT_TYPES[field];
    return <input {...fieldProps(field)} type={type} autoComplete={autoComplete} />;
  };

  const shownFields = OWNER_FORM_FIELDS.filter((field) => isFieldShown(field, values.owner_type));

  return (
    <div className="host-owners-modal-overlay">
      <dialog className="host-owners-modal" open aria-modal="true" aria-labelledby={TITLE_ID}>
        <div className="host-owners-modal-header">
          <h3 id={TITLE_ID} className="host-owners-modal-title">
            {isEdit ? texts.editTitle : texts.createTitle}
          </h3>
          <button
            type="button"
            className="host-owners-close-button"
            aria-label={texts.close}
            onClick={onClose}
            disabled={isSaving}>
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <form className="host-owners-form" onSubmit={handleSubmit} aria-labelledby={TITLE_ID} noValidate>
          <div className="host-owners-form-body">
            {serverError ? (
              <p className="host-owners-form-error" role="alert">
                {serverError}
              </p>
            ) : null}
            {shownFields.map((field) => (
              <div key={field} className="host-owners-field">
                <label htmlFor={fieldId(field)}>{texts.labels[field]}</label>
                {renderControl(field)}
                {errors[field] ? (
                  <p id={`${fieldId(field)}-error`} className="host-owners-field-error">
                    {errorText(field)}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
          <div className="host-owners-modal-actions">
            <button type="button" className="host-owners-button-secondary" onClick={onClose} disabled={isSaving}>
              {texts.cancel}
            </button>
            <button type="submit" className="host-owners-button" disabled={isSaving || !canSave}>
              {isSaving ? texts.saving : texts.save}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
};

OwnerFormModal.propTypes = {
  owner: PropTypes.object,
  t: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
};

export default OwnerFormModal;
