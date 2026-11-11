import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import PulseBarsLoader from "../../../../components/loaders/PulseBarsLoader";
import { fetchHostPropertySelectOptions } from "../../services/hostTaskPropertyService";
import { listOwners, setShares } from "../services/ownerService";
import { basisPointsToPercent } from "../utils/basisPoints";
import { DEFAULT_OWNER_STATUS } from "../utils/ownerFormRules";
import {
  canRetryLoad,
  fillTemplate,
  isConflictError,
  labelFor,
  loadErrorText,
  ownerName,
  saveErrorText,
} from "../utils/ownerText";
import {
  buildSetSharesPayload,
  currentSplitForProperty,
  plannedChangeFrom,
  propertyChoices,
  selectableOwners,
  shareTotalBasisPoints,
  validateShares,
} from "../utils/shareRules";
import { dateInputToUtcMidnight, latestEffectiveFrom, todayUtc, utcMidnightToDateInput } from "../utils/utcDate";
import { percentFormatter } from "./OwnersTable";

const ID_PREFIX = "host-owners-shares";
const TITLE_ID = `${ID_PREFIX}-title`;
const PROPERTY_ID = `${ID_PREFIX}-property`;
const DATE_ID = `${ID_PREFIX}-date`;

const rowFieldId = (field, key) => `${ID_PREFIX}-${field}-${key}`;
const errorId = (fieldId) => `${fieldId}-error`;

export const utcDateFormatter = (language) => {
  const dateFormat = new Intl.DateTimeFormat(language, { dateStyle: "long", timeZone: "UTC" });
  return (timestamp) => dateFormat.format(timestamp);
};

const withoutKey = (object, key) => Object.fromEntries(Object.entries(object).filter(([entryKey]) => entryKey !== key));

const rowPercent = (row) => basisPointsToPercent(shareTotalBasisPoints([row])) ?? 0;

const hasUpcoming = (result) => Array.isArray(result?.upcoming) && result.upcoming.length > 0;

const sameId = (left, right) =>
  typeof left === "string" && typeof right === "string" && left.toLowerCase() === right.toLowerCase();

const SetSharesModal = ({ t, language, initialOwnerId, onClose, onSaved }) => {
  const texts = t.shares;
  const [loadState, setLoadState] = useState({ status: "loading" });
  const [propertyId, setPropertyId] = useState("");
  const [dateInput, setDateInput] = useState(() => utcMidnightToDateInput(todayUtc()));
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(null);
  const isMounted = useRef(true);
  const nextRowKey = useRef(0);
  const fieldRefs = useRef({});
  const summaryCloseRef = useRef(null);

  const load = useCallback(async () => {
    setLoadState({ status: "loading" });
    try {
      const [owners, propertyOptions] = await Promise.all([listOwners(), fetchHostPropertySelectOptions()]);
      if (!isMounted.current) {
        return;
      }
      const isReadable = Array.isArray(owners) && Array.isArray(propertyOptions);
      setLoadState(
        isReadable
          ? { status: "ready", owners, choices: propertyChoices(propertyOptions, t.unknownProperty) }
          : { status: "error", error: null }
      );
    } catch (error) {
      if (isMounted.current) {
        setLoadState({ status: "error", error });
      }
    }
  }, [t.unknownProperty]);

  useEffect(() => {
    isMounted.current = true;
    void load();
    return () => {
      isMounted.current = false;
    };
  }, [load]);

  useEffect(() => {
    if (loadState.status === "ready") {
      fieldRefs.current.property?.focus();
    }
  }, [loadState.status]);

  useEffect(() => {
    if (saved) {
      summaryCloseRef.current?.focus();
    }
  }, [saved]);

  const finish = useCallback(() => onSaved(saved), [onSaved, saved]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== "Escape" || isSaving) {
        return;
      }
      if (saved) {
        finish();
      } else {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [finish, isSaving, onClose, saved]);

  const owners = loadState.status === "ready" ? loadState.owners : [];
  const choices = loadState.status === "ready" ? loadState.choices : [];
  const ownerOptions = selectableOwners(owners);
  const formatPercent = percentFormatter(language);
  const formatDate = utcDateFormatter(language);

  const newRow = (ownerId, percent) => {
    nextRowKey.current += 1;
    return { key: nextRowKey.current, ownerId, percent };
  };

  const rowsForProperty = (id) => {
    const current = currentSplitForProperty(owners, id).map((row) => newRow(row.ownerId, row.percent));
    const canAddInitialOwner =
      ownerOptions.some((owner) => owner.id === initialOwnerId) &&
      !current.some((row) => row.ownerId === initialOwnerId);
    return canAddInitialOwner ? [...current, newRow(initialOwnerId, "")] : current;
  };

  const handlePropertyChange = (event) => {
    const id = event.target.value;
    setPropertyId(id);
    setRows(id === "" ? [] : rowsForProperty(id));
    setErrors({});
    setServerError(null);
  };

  const handleDateChange = (event) => {
    setDateInput(event.target.value);
    setErrors((previous) => withoutKey(previous, "date"));
  };

  const updateRow = (index, field, value) => {
    setRows((previous) => previous.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));
    setErrors((previous) => {
      const rowErrors = withoutKey(previous.rows?.[index] ?? {}, field === "ownerId" ? "owner" : "percent");
      const otherRows = withoutKey(previous.rows ?? {}, String(index));
      const nextRows = Object.keys(rowErrors).length > 0 ? { ...otherRows, [index]: rowErrors } : otherRows;
      const rest = withoutKey(withoutKey(previous, "rows"), "shares");
      return Object.keys(nextRows).length > 0 ? { ...rest, rows: nextRows } : rest;
    });
  };

  const changeRowCount = (nextRows) => {
    setRows(nextRows);
    setErrors((previous) => withoutKey(withoutKey(previous, "rows"), "shares"));
  };

  const addRow = () => changeRowCount([...rows, newRow("", "")]);

  const removeRow = (index) => changeRowCount(rows.filter((_row, rowIndex) => rowIndex !== index));

  const errorFieldOrder = (nextErrors) => [
    ...(nextErrors.property ? ["property"] : []),
    ...(nextErrors.date ? ["date"] : []),
    ...rows.flatMap((row, index) => [
      ...(nextErrors.rows?.[index]?.owner ? [`owner-${row.key}`] : []),
      ...(nextErrors.rows?.[index]?.percent ? [`percent-${row.key}`] : []),
    ]),
  ];

  const saveErrorMessage = (error, submittedDate) => {
    if (!isConflictError(error)) {
      return saveErrorText(error, t);
    }
    return dateInputToUtcMidnight(submittedDate) === todayUtc() ? texts.errorChangedToday : texts.errorConflict;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSaving) {
      return;
    }
    const nextErrors = validateShares({ propertyId, dateInput, rows });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const [firstField] = errorFieldOrder(nextErrors);
      fieldRefs.current[firstField]?.focus();
      return;
    }
    const propertyTitle = choices.find((choice) => choice.value === propertyId)?.label ?? t.unknownProperty;
    setServerError(null);
    setIsSaving(true);
    try {
      const result = await setShares(buildSetSharesPayload({ propertyId, dateInput, rows }));
      const outcome = { result, propertyTitle, dateInput };
      if (hasUpcoming(result)) {
        setSaved(outcome);
        setIsSaving(false);
      } else {
        onSaved(outcome);
      }
    } catch (error) {
      setServerError(saveErrorMessage(error, dateInput));
      setIsSaving(false);
    }
  };

  const ownerLabel = (owner) =>
    owner.status === DEFAULT_OWNER_STATUS
      ? ownerName(owner)
      : `${ownerName(owner)} (${labelFor(t.statuses, owner.status)})`;

  const ownerById = (id) => owners.find((owner) => sameId(owner.id, id));

  const removeLabel = (row) => {
    const owner = ownerById(row.ownerId);
    return owner ? fillTemplate(texts.removeOwnerLabel, { name: ownerName(owner) }) : texts.removeOwner;
  };

  const invalidProps = (hasError, fieldId) => ({
    "aria-invalid": hasError,
    "aria-describedby": hasError ? errorId(fieldId) : undefined,
  });

  const fieldError = (key, fieldId) =>
    key ? (
      <p id={errorId(fieldId)} className="host-owners-field-error">
        {texts.errors[key]}
      </p>
    ) : null;

  const setRef = (name) => (element) => {
    fieldRefs.current[name] = element;
  };

  const header = (
    <div className="host-owners-modal-header">
      <h3 id={TITLE_ID} className="host-owners-modal-title">
        {texts.title}
      </h3>
      <button
        type="button"
        className="host-owners-close-button"
        aria-label={t.form.close}
        onClick={saved ? finish : onClose}
        disabled={isSaving}>
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );

  const renderLoadState = () =>
    loadState.status === "loading" ? (
      <div className="host-owners-form-body">
        <PulseBarsLoader message={t.loading} />
      </div>
    ) : (
      <>
        <div className="host-owners-form-body">
          <div className="host-owners-message" role="alert">
            <p>{loadErrorText(loadState.error, t)}</p>
            {canRetryLoad(loadState.error) ? (
              <button type="button" className="host-owners-button" onClick={load}>
                {t.retry}
              </button>
            ) : null}
          </div>
        </div>
        <div className="host-owners-modal-actions">
          <button type="button" className="host-owners-button-secondary" onClick={onClose}>
            {texts.cancel}
          </button>
        </div>
      </>
    );

  const renderSummary = () => (
    <>
      <div className="host-owners-form-body">
        <h4 className="host-owners-shares-summary-title">{texts.upcomingTitle}</h4>
        <ul className="host-owners-properties">
          {saved.result.upcoming.map((share) => {
            const owner = ownerById(share.owner_id);
            const percent = basisPointsToPercent(share.ownership_basis_points);
            return (
              <li key={`${share.owner_id}-${share.effective_from}`}>
                {fillTemplate(t.propertyShare, {
                  title: owner ? ownerName(owner) : share.owner_id,
                  percent: percent === null ? "" : formatPercent(percent),
                })}
              </li>
            );
          })}
        </ul>
      </div>
      <div className="host-owners-modal-actions">
        <button type="button" className="host-owners-button" ref={summaryCloseRef} onClick={finish}>
          {t.form.close}
        </button>
      </div>
    </>
  );

  const renderRow = (row, index) => {
    const ownerFieldId = rowFieldId("owner", row.key);
    const percentFieldId = rowFieldId("percent", row.key);
    const rowErrors = errors.rows?.[index] ?? {};
    const chosenElsewhere = new Set(
      rows.filter((_other, otherIndex) => otherIndex !== index).map((other) => other.ownerId)
    );
    return (
      <li key={row.key} className="host-owners-shares-row">
        <div className="host-owners-field host-owners-shares-owner">
          <label htmlFor={ownerFieldId}>{texts.ownerColumn}</label>
          <select
            id={ownerFieldId}
            ref={setRef(`owner-${row.key}`)}
            value={row.ownerId}
            onChange={(event) => updateRow(index, "ownerId", event.target.value)}
            {...invalidProps(Boolean(rowErrors.owner), ownerFieldId)}>
            <option value="" disabled>
              {texts.chooseOwner}
            </option>
            {ownerOptions.map((owner) => (
              <option key={owner.id} value={owner.id} disabled={chosenElsewhere.has(owner.id)}>
                {ownerLabel(owner)}
              </option>
            ))}
          </select>
          {fieldError(rowErrors.owner, ownerFieldId)}
        </div>
        <div className="host-owners-field host-owners-shares-percent">
          <label htmlFor={percentFieldId}>{texts.percentColumn}</label>
          <input
            id={percentFieldId}
            ref={setRef(`percent-${row.key}`)}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={row.percent}
            onChange={(event) => updateRow(index, "percent", event.target.value)}
            {...invalidProps(Boolean(rowErrors.percent), percentFieldId)}
          />
          {fieldError(rowErrors.percent, percentFieldId)}
        </div>
        <button
          type="button"
          className="host-owners-link-button host-owners-shares-remove"
          aria-label={removeLabel(row)}
          onClick={() => removeRow(index)}
          disabled={isSaving}>
          {texts.removeOwner}
        </button>
      </li>
    );
  };

  const renderForm = () => {
    const plannedFrom = propertyId === "" ? null : plannedChangeFrom(owners, propertyId);
    const totalPercent = rows.reduce((sum, row) => sum + rowPercent(row), 0);
    return (
      <form className="host-owners-form" onSubmit={handleSubmit} aria-labelledby={TITLE_ID} noValidate>
        <div className="host-owners-form-body">
          {serverError ? (
            <p className="host-owners-form-error" role="alert">
              {serverError}
            </p>
          ) : null}
          <div className="host-owners-field">
            <label htmlFor={PROPERTY_ID}>{texts.propertyLabel}</label>
            <select
              id={PROPERTY_ID}
              ref={setRef("property")}
              value={propertyId}
              onChange={handlePropertyChange}
              {...invalidProps(Boolean(errors.property), PROPERTY_ID)}>
              <option value="">{texts.propertyPlaceholder}</option>
              {choices.map((choice) => (
                <option key={choice.value} value={choice.value}>
                  {choice.label}
                </option>
              ))}
            </select>
            {fieldError(errors.property, PROPERTY_ID)}
          </div>
          {plannedFrom === null ? null : (
            <p className="host-owners-shares-warning">
              {fillTemplate(texts.plannedChangeWarning, { date: formatDate(plannedFrom) })}
            </p>
          )}
          <div className="host-owners-field">
            <label htmlFor={DATE_ID}>{texts.dateLabel}</label>
            <input
              id={DATE_ID}
              ref={setRef("date")}
              type="date"
              min={utcMidnightToDateInput(todayUtc())}
              max={utcMidnightToDateInput(latestEffectiveFrom())}
              value={dateInput}
              onChange={handleDateChange}
              {...invalidProps(Boolean(errors.date), DATE_ID)}
            />
            {fieldError(errors.date, DATE_ID)}
          </div>
          {propertyId === "" ? null : (
            <>
              <ul className="host-owners-shares-rows">{rows.map(renderRow)}</ul>
              <div className="host-owners-shares-footer">
                <button type="button" className="host-owners-button-secondary" onClick={addRow} disabled={isSaving}>
                  {texts.addOwner}
                </button>
                <p className="host-owners-shares-total" aria-live="polite">
                  <span>{texts.totalLabel}</span>{" "}
                  <strong>{fillTemplate(texts.totalValue, { percent: formatPercent(totalPercent) })}</strong>
                </p>
              </div>
              {errors.shares ? (
                <p className="host-owners-field-error" role="alert">
                  {texts.errors[errors.shares]}
                </p>
              ) : null}
            </>
          )}
        </div>
        <div className="host-owners-modal-actions">
          <button type="button" className="host-owners-button-secondary" onClick={onClose} disabled={isSaving}>
            {texts.cancel}
          </button>
          <button type="submit" className="host-owners-button" disabled={isSaving}>
            {isSaving ? texts.saving : texts.save}
          </button>
        </div>
      </form>
    );
  };

  const renderBody = () => {
    if (saved) {
      return renderSummary();
    }
    return loadState.status === "ready" ? renderForm() : renderLoadState();
  };

  return (
    <div className="host-owners-modal-overlay">
      <dialog className="host-owners-modal host-owners-modal--wide" open aria-modal="true" aria-labelledby={TITLE_ID}>
        {header}
        {renderBody()}
      </dialog>
    </div>
  );
};

SetSharesModal.propTypes = {
  t: PropTypes.object.isRequired,
  language: PropTypes.string.isRequired,
  initialOwnerId: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
};

export default SetSharesModal;
