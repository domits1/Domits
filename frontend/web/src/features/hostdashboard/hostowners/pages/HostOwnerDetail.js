import React, { useCallback, useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import PulseBarsLoader from "../../../../components/loaders/PulseBarsLoader";
import { LanguageContext } from "../../../../context/LanguageContext";
import ConfirmDialog from "../../hosttasks/components/ConfirmDialog";
import { archiveOwner, getOwner, updateOwner } from "../services/ownerService";
import OwnerFormModal from "../components/OwnerFormModal";
import { OwnerProperties, percentFormatter, statusClassName } from "../components/OwnersTable";
import SetSharesModal, { utcDateFormatter } from "../components/SetSharesModal";
import { dateInputToUtcMidnight } from "../utils/utcDate";
import { resolveOwnerContent } from "../utils/ownerContent";
import { ARCHIVED_OWNER_STATUS, DEFAULT_OWNER_STATUS, OWNER_FORM_FIELDS, isFieldShown } from "../utils/ownerFormRules";
import {
  archiveErrorText,
  canRetryLoad,
  detailLoadErrorText,
  fillTemplate,
  isNotFoundError,
  labelFor,
  ownerName,
  saveErrorText,
} from "../utils/ownerText";
import "../styles/HostOwners.scss";

const TITLE_ID = "host-owner-detail-title";
const DETAILS_TITLE_ID = "host-owner-detail-details";
const PROPERTIES_TITLE_ID = "host-owner-detail-properties";
const TIMESTAMP_FIELDS = Object.freeze(["created_at", "updated_at"]);
const CLOSED_DIALOG = Object.freeze({ isOpen: false });

const isOwnerRecord = (value) => value !== null && typeof value === "object" && typeof value.id === "string";

const OwnerDetail = ({ id }) => {
  const { language } = useContext(LanguageContext);
  const { activeLanguage, t } = resolveOwnerContent(language);
  const texts = t.detail;

  const [loadState, setLoadState] = useState({ status: "loading" });
  const [pendingAction, setPendingAction] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSettingShares, setIsSettingShares] = useState(false);

  const loadOwner = useCallback(async () => {
    setLoadState({ status: "loading" });
    try {
      const owner = await getOwner(id);
      setLoadState(isOwnerRecord(owner) ? { status: "ready", owner } : { status: "error", error: null });
    } catch (error) {
      setLoadState({ status: "error", error });
    }
  }, [id]);

  useEffect(() => {
    void loadOwner();
  }, [loadOwner]);

  const closeEditor = useCallback(() => setIsEditing(false), []);
  const closeShares = useCallback(() => setIsSettingShares(false), []);

  const handleSharesSaved = useCallback(
    ({ propertyTitle, dateInput }) => {
      setIsSettingShares(false);
      setActionError(null);
      const date = utcDateFormatter(activeLanguage)(dateInputToUtcMidnight(dateInput));
      toast.success(fillTemplate(t.shares.savedToast, { property: propertyTitle, date }));
      void loadOwner();
    },
    [activeLanguage, loadOwner, t.shares.savedToast]
  );

  if (loadState.status === "loading") {
    return <PulseBarsLoader message={texts.loading} />;
  }

  if (loadState.status === "error") {
    return (
      <div className="host-owners-message" role="alert">
        <p>{detailLoadErrorText(loadState.error, t)}</p>
        {canRetryLoad(loadState.error) ? (
          <button type="button" className="host-owners-button" onClick={loadOwner}>
            {t.retry}
          </button>
        ) : null}
      </div>
    );
  }

  const { owner } = loadState;
  const name = ownerName(owner);
  const isArchived = owner.status === ARCHIVED_OWNER_STATUS;
  const isBusy = pendingAction !== null;

  const runAction = async (kind, request, successTemplate, errorText) => {
    setPendingAction(kind);
    setActionError(null);
    try {
      const saved = await request();
      if (isOwnerRecord(saved)) {
        setLoadState({ status: "ready", owner: saved });
        toast.success(fillTemplate(successTemplate, { name: ownerName(saved) }));
      } else {
        setActionError(t.form.errorGeneric);
      }
    } catch (error) {
      if (isNotFoundError(error)) {
        setLoadState({ status: "error", error });
      } else {
        setActionError(errorText(error));
      }
    } finally {
      setPendingAction(null);
    }
  };

  const confirmArchive = () => {
    setIsConfirmOpen(false);
    void runAction(
      "archive",
      () => archiveOwner(owner.id),
      texts.archivedToast,
      (error) => archiveErrorText(error, t, name)
    );
  };

  const restore = () =>
    runAction(
      "restore",
      () => updateOwner(owner.id, { status: DEFAULT_OWNER_STATUS }),
      texts.restoredToast,
      (error) => saveErrorText(error, t)
    );

  const handleSaved = (saved) => {
    setLoadState({ status: "ready", owner: saved });
    setIsEditing(false);
    setActionError(null);
    toast.success(fillTemplate(t.form.updatedToast, { name: ownerName(saved) }));
  };

  const dateFormat = new Intl.DateTimeFormat(activeLanguage, { dateStyle: "medium", timeStyle: "short" });
  const timestampText = (value) => (Number.isFinite(value) ? dateFormat.format(value) : texts.notProvided);

  const fieldValue = (field) => {
    if (field === "owner_type") {
      return labelFor(t.ownerTypes, owner.owner_type);
    }
    if (field === "status") {
      return <span className={statusClassName(owner.status, t.statuses)}>{labelFor(t.statuses, owner.status)}</span>;
    }
    const value = owner[field];
    return typeof value === "string" && value.trim() !== "" ? value : texts.notProvided;
  };

  const shownFields = OWNER_FORM_FIELDS.filter((field) => isFieldShown(field, owner.owner_type));

  const archiveDialog = isConfirmOpen
    ? {
        isOpen: true,
        title: texts.archiveConfirmTitle,
        message: fillTemplate(texts.archiveConfirmMessage, { name }),
        cancelText: t.form.cancel,
        confirmText: texts.archive,
        onConfirm: confirmArchive,
      }
    : CLOSED_DIALOG;

  return (
    <>
      <div className="host-owners-header">
        <div>
          <h2 id={TITLE_ID} className="host-owners-title">
            {name}
          </h2>
          {owner.company_name ? <span className="host-owners-company">{owner.company_name}</span> : null}
        </div>
        <div className="host-owner-detail-actions">
          <button
            type="button"
            className="host-owners-button-secondary"
            onClick={() => setIsEditing(true)}
            disabled={isBusy}>
            {t.editOwner}
          </button>
          {isArchived ? null : (
            <button
              type="button"
              className="host-owners-button-secondary"
              onClick={() => setIsSettingShares(true)}
              disabled={isBusy}>
              {t.shares.title}
            </button>
          )}
          {isArchived ? (
            <button type="button" className="host-owners-button" onClick={restore} disabled={isBusy}>
              {pendingAction === "restore" ? texts.restoring : texts.restore}
            </button>
          ) : (
            <button
              type="button"
              className="host-owners-button-secondary"
              onClick={() => setIsConfirmOpen(true)}
              disabled={isBusy}>
              {pendingAction === "archive" ? texts.archiving : texts.archive}
            </button>
          )}
        </div>
      </div>
      {actionError ? (
        <p className="host-owners-form-error" role="alert">
          {actionError}
        </p>
      ) : null}
      <section className="host-owners-card host-owner-detail-section" aria-labelledby={DETAILS_TITLE_ID}>
        <h3 id={DETAILS_TITLE_ID} className="host-owner-detail-heading">
          {texts.detailsTitle}
        </h3>
        <dl className="host-owner-detail-fields">
          {shownFields.map((field) => (
            <div key={field} className="host-owner-detail-field">
              <dt>{t.form.labels[field]}</dt>
              <dd className={field === "notes" ? "host-owner-detail-notes" : undefined}>{fieldValue(field)}</dd>
            </div>
          ))}
          {TIMESTAMP_FIELDS.map((field) => (
            <div key={field} className="host-owner-detail-field">
              <dt>{texts.labels[field]}</dt>
              <dd>{timestampText(owner[field])}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="host-owners-card host-owner-detail-section" aria-labelledby={PROPERTIES_TITLE_ID}>
        <h3 id={PROPERTIES_TITLE_ID} className="host-owner-detail-heading">
          {t.columnProperties}
        </h3>
        <OwnerProperties properties={owner.properties} t={t} formatPercent={percentFormatter(activeLanguage)} />
      </section>
      <ConfirmDialog confirmDialog={archiveDialog} onCancel={() => setIsConfirmOpen(false)} />
      {isEditing ? <OwnerFormModal owner={owner} t={t} onClose={closeEditor} onSaved={handleSaved} /> : null}
      {isSettingShares ? (
        <SetSharesModal
          t={t}
          language={activeLanguage}
          initialOwnerId={owner.id}
          onClose={closeShares}
          onSaved={handleSharesSaved}
        />
      ) : null}
    </>
  );
};

OwnerDetail.propTypes = {
  id: PropTypes.string.isRequired,
};

const HostOwnerDetail = () => {
  const { id } = useParams();
  const { language } = useContext(LanguageContext);
  const { t } = resolveOwnerContent(language);

  return (
    <div className="page-body host-owners host-owner-detail">
      <Link className="host-owners-back-link" to=".." relative="path">
        {t.detail.backToOwners}
      </Link>
      <OwnerDetail key={id} id={id} />
    </div>
  );
};

export default HostOwnerDetail;
