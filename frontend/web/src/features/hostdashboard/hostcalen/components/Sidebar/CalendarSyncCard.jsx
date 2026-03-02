import React from "react";
import arrowLeftIcon from "../../../../../images/arrow-left-icon.svg";
import arrowRightIcon from "../../../../../images/arrow-right-icon.svg";
import calendarIcon from "../../../../../images/icons/calendar.png";
import airbnbIcon from "../../../../../images/icon-airbnb.png";
import bookingIcon from "../../../../../images/icon-booking.png";

const CALENDAR_PROVIDER = {
  AUTO: "auto",
  AIRBNB: "airbnb",
  BOOKING: "booking",
  GENERIC: "generic",
};

const REMOVE_SOURCE_FLOW_STEP = {
  REASON: "reason",
  CONFIRM: "confirm",
};

const REMOVE_SOURCE_REASONS = [
  { id: "sync-not-needed", label: "I no longer need this sync connection." },
  { id: "wrong-calendar", label: "I linked the wrong calendar." },
  { id: "sync-issues", label: "The imported availability does not look right." },
  { id: "managing-manually", label: "I prefer to manage availability manually." },
  { id: "other", label: "Other" },
];

const normalizeCalendarProvider = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized || normalized === CALENDAR_PROVIDER.AUTO) {
    return "";
  }
  if (normalized === CALENDAR_PROVIDER.AIRBNB || normalized === CALENDAR_PROVIDER.BOOKING) {
    return normalized;
  }
  return CALENDAR_PROVIDER.GENERIC;
};

const resolveCalendarProvider = (source = {}) => {
  const explicitProvider = normalizeCalendarProvider(
    source?.calendarProvider ?? source?.provider ?? source?.channel ?? ""
  );
  if (explicitProvider) {
    return explicitProvider;
  }

  const calendarUrl = String(source?.calendarUrl || source?.url || "").trim().toLowerCase();
  const calendarName = String(source?.calendarName || source?.name || "").trim().toLowerCase();

  let hostname = "";
  if (calendarUrl) {
    try {
      hostname = String(new URL(calendarUrl).hostname || "").toLowerCase();
    } catch {
      hostname = "";
    }
  }

  if (
    hostname.includes("airbnb") ||
    calendarUrl.includes("airbnb") ||
    calendarName.includes("airbnb")
  ) {
    return CALENDAR_PROVIDER.AIRBNB;
  }

  if (
    hostname.includes("booking.com") ||
    calendarUrl.includes("booking.com") ||
    calendarName.includes("booking")
  ) {
    return CALENDAR_PROVIDER.BOOKING;
  }

  return CALENDAR_PROVIDER.GENERIC;
};

const getProviderIcon = (provider) => {
  if (provider === CALENDAR_PROVIDER.AIRBNB) {
    return airbnbIcon;
  }
  if (provider === CALENDAR_PROVIDER.BOOKING) {
    return bookingIcon;
  }
  return calendarIcon;
};

const formatLastSyncLabel = (value) => {
  if (!value) {
    return "Last synced: unknown";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Last synced: unknown";
  }

  const diffMs = Date.now() - date.getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return "Last synced: just now";
  }

  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) {
    return "Last synced: just now";
  }
  if (diffMinutes < 60) {
    return `Last synced: ${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `Last synced: ${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `Last synced: ${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
};

export default function CalendarSyncCard({
  domitsCalendarLink,
  externalCalendarUrlInput,
  calendarNameInput,
  calendarProviderInput,
  onExternalCalendarUrlChange,
  onCalendarNameChange,
  onCalendarProviderChange,
  onCopyDomitsCalendarLink,
  domitsCalendarLinkCopied,
  onAddCalendar,
  canAddCalendar,
  addingCalendar,
  addCalendarError,
  isEditingCalendar,
  connectedSources,
  onEditSource,
  editingSourceId,
  onCancelEdit,
  onRefreshSource,
  refreshingSourceId,
  onRemoveSource,
  removingSourceId,
  onBack,
}) {
  const [isConnectionSetupOpen, setIsConnectionSetupOpen] = React.useState(false);
  const [pendingRemoveSourceId, setPendingRemoveSourceId] = React.useState("");
  const [removeSourceFlowStep, setRemoveSourceFlowStep] = React.useState(REMOVE_SOURCE_FLOW_STEP.REASON);
  const [selectedRemoveReasonIds, setSelectedRemoveReasonIds] = React.useState([]);
  const sources = Array.isArray(connectedSources) ? connectedSources : [];
  const hasConnections = sources.length > 0;
  const showConnectionSetup = !hasConnections || isConnectionSetupOpen;
  const hasRefreshInProgress = Boolean(String(refreshingSourceId || "").trim());
  const isConfirmingRemoval = Boolean(String(pendingRemoveSourceId || "").trim());
  const isRemovingPendingSource =
    String(removingSourceId || "").trim() === String(pendingRemoveSourceId || "").trim();

  const pendingRemoveSource = React.useMemo(() => {
    const normalizedPendingSourceId = String(pendingRemoveSourceId || "").trim();
    if (!normalizedPendingSourceId) {
      return null;
    }

    return (
      sources.find((source, index) => {
        const sourceId = String(source?.sourceId || source?.id || `${index}`);
        return sourceId === normalizedPendingSourceId;
      }) || null
    );
  }, [pendingRemoveSourceId, sources]);

  const pendingRemoveSourceName = String(
    pendingRemoveSource?.calendarName || pendingRemoveSource?.name || "this calendar"
  ).trim();
  const selectedRemoveReasonIdSet = React.useMemo(
    () => new Set(selectedRemoveReasonIds),
    [selectedRemoveReasonIds]
  );
  const hasSelectedRemoveReason = selectedRemoveReasonIdSet.size > 0;
  const isRemoveReasonStep = removeSourceFlowStep === REMOVE_SOURCE_FLOW_STEP.REASON;

  const resetRemoveSourceFlow = React.useCallback(() => {
    setPendingRemoveSourceId("");
    setRemoveSourceFlowStep(REMOVE_SOURCE_FLOW_STEP.REASON);
    setSelectedRemoveReasonIds([]);
  }, []);

  const handleOpenRemoveSourceFlow = React.useCallback((sourceId) => {
    setPendingRemoveSourceId(sourceId);
    setRemoveSourceFlowStep(REMOVE_SOURCE_FLOW_STEP.REASON);
    setSelectedRemoveReasonIds([]);
  }, []);

  const handleToggleRemoveReason = React.useCallback((reasonId) => {
    setSelectedRemoveReasonIds((previous) =>
      previous.includes(reasonId)
        ? previous.filter((value) => value !== reasonId)
        : [...previous, reasonId]
    );
  }, []);

  const handleRemoveReasonsNext = () => {
    if (isRemovingPendingSource || !hasSelectedRemoveReason) {
      return;
    }
    setRemoveSourceFlowStep(REMOVE_SOURCE_FLOW_STEP.CONFIRM);
  };

  React.useEffect(() => {
    if (!isEditingCalendar && !isConfirmingRemoval) {
      return undefined;
    }
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !addingCalendar && !isRemovingPendingSource) {
        if (isEditingCalendar) {
          onCancelEdit?.();
          return;
        }
        resetRemoveSourceFlow();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isEditingCalendar,
    onCancelEdit,
    addingCalendar,
    isConfirmingRemoval,
    isRemovingPendingSource,
    resetRemoveSourceFlow,
  ]);

  React.useEffect(() => {
    const normalizedPendingSourceId = String(pendingRemoveSourceId || "").trim();
    if (!normalizedPendingSourceId || isRemovingPendingSource) {
      return;
    }

    const sourceStillExists = sources.some((source, index) => {
      const sourceId = String(source?.sourceId || source?.id || `${index}`);
      return sourceId === normalizedPendingSourceId;
    });

    if (!sourceStillExists) {
      resetRemoveSourceFlow();
    }
  }, [pendingRemoveSourceId, sources, isRemovingPendingSource, resetRemoveSourceFlow]);

  React.useEffect(() => {
    if (!isConfirmingRemoval) {
      setRemoveSourceFlowStep(REMOVE_SOURCE_FLOW_STEP.REASON);
      setSelectedRemoveReasonIds([]);
    }
  }, [isConfirmingRemoval]);

  const handleConfirmRemoveSource = async () => {
    if (!onRemoveSource || !pendingRemoveSourceId || isRemovingPendingSource) {
      return;
    }
    await onRemoveSource(pendingRemoveSourceId);
  };

  const handleBack = () => {
    if (isConfirmingRemoval && !isRemovingPendingSource) {
      resetRemoveSourceFlow();
      return;
    }
    if (hasConnections && isConnectionSetupOpen) {
      setIsConnectionSetupOpen(false);
      return;
    }
    onBack?.();
  };

  let removeConfirmButtonLabel = "Remove calendar";
  if (isRemoveReasonStep) {
    removeConfirmButtonLabel = "Next";
  } else if (isRemovingPendingSource) {
    removeConfirmButtonLabel = "Removing...";
  }

  const renderConnectedSection = () => (
    <section className="hc-sync-connected">
      <p className="hc-sync-connected-title">Connected calendars</p>
      <ul className="hc-sync-connected-list">
        {sources.map((source, index) => {
          const sourceId = String(source?.sourceId || source?.id || `${index}`);
          const sourceName = String(source?.calendarName || source?.name || "External calendar");
          const isRemoving = String(removingSourceId || "") === sourceId;
          const isRefreshing = String(refreshingSourceId || "") === sourceId;
          const isEditing = String(editingSourceId || "") === sourceId;
          const provider = resolveCalendarProvider(source);
          const providerIcon = getProviderIcon(provider);
          const isProviderIcon = provider !== CALENDAR_PROVIDER.GENERIC;
          return (
            <li key={sourceId} className="hc-sync-connected-card">
              <div className="hc-sync-connected-card-head">
                <span className="hc-sync-connected-card-icon" aria-hidden="true">
                  <img
                    src={providerIcon}
                    alt=""
                    className={
                      isProviderIcon
                        ? "hc-sync-connected-card-icon-image hc-sync-connected-card-icon-image--provider"
                        : "hc-sync-connected-card-icon-image"
                    }
                  />
                </span>
                <div className="hc-sync-connected-card-copy">
                  <p className="hc-sync-connected-card-name">{sourceName}</p>
                  <p className="hc-sync-connected-card-status">Sync active</p>
                  <p className="hc-sync-connected-card-meta">{formatLastSyncLabel(source?.lastSyncAt)}</p>
                </div>
              </div>
              <div className="hc-sync-connected-card-actions">
                <button
                  type="button"
                  className={`hc-sync-source-action ${isRefreshing ? "is-active" : ""}`}
                  disabled={
                    !onRefreshSource ||
                    addingCalendar ||
                    hasRefreshInProgress ||
                    isRemoving ||
                    isConfirmingRemoval
                  }
                  onClick={() => onRefreshSource?.(sourceId)}
                >
                  {isRefreshing ? "Syncing..." : "Sync now"}
                </button>
                <button
                  type="button"
                  className={`hc-sync-source-action ${isEditing ? "is-active" : ""}`}
                  disabled={!onEditSource || addingCalendar || hasRefreshInProgress || isRemoving}
                  onClick={() => {
                    onEditSource?.(sourceId);
                  }}
                >
                  {isEditing ? "Editing" : "Edit"}
                </button>
                <button
                  type="button"
                  className="hc-sync-source-action hc-sync-source-action--danger"
                  disabled={
                    !onRemoveSource ||
                    isRemoving ||
                    hasRefreshInProgress ||
                    addingCalendar ||
                    isConfirmingRemoval
                  }
                  onClick={() => handleOpenRemoveSourceFlow(sourceId)}
                >
                  {isRemoving ? "Removing..." : "Remove"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );

  return (
    <section className="hc-sync-card" aria-label="Sync calendars">
      <header className="hc-sync-header">
        <button
          type="button"
          className="hc-sync-back"
          onClick={handleBack}
          aria-label={hasConnections && isConnectionSetupOpen ? "Back to sync overview" : "Back to summary"}
        >
          <img src={arrowLeftIcon} alt="" aria-hidden="true" className="hc-chevron-icon" />
        </button>
      </header>

      <h3 className="hc-sync-title">Sync calendars</h3>
      <p className="hc-sync-copy">
        Keep your availability up-to-date across different platforms. Sync calendars to automatically
        reflect changes in bookings.
      </p>

      {showConnectionSetup ? (
        <form
          className="hc-sync-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (canAddCalendar) {
              onAddCalendar?.();
            }
          }}
        >
          <section className="hc-sync-step">
            <h4 className="hc-sync-step-title">Step 1</h4>
            <p className="hc-sync-step-copy">Add this link to the other website.</p>

            <div className="hc-sync-link-box">
              <p className="hc-sync-field-label">Domits calendar link</p>
              <div className="hc-sync-copy-row">
                <input
                  type="text"
                  className="hc-sync-input hc-sync-input--readonly"
                  value={domitsCalendarLink}
                  readOnly
                />
                <button
                  type="button"
                  className={`hc-sync-copy-btn ${domitsCalendarLinkCopied ? "is-copied" : ""}`}
                  disabled={!domitsCalendarLink}
                  onClick={() => onCopyDomitsCalendarLink?.()}
                >
                  {domitsCalendarLinkCopied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </section>

          <section className="hc-sync-step">
            <h4 className="hc-sync-step-title">Step 2</h4>
            <p className="hc-sync-step-copy">Get a public iCal feed link from the other website and add it below.</p>

            <div className="hc-sync-fields">
              <input
                type="text"
                className="hc-sync-input"
                placeholder="Other website link"
                value={externalCalendarUrlInput}
                onChange={(event) => onExternalCalendarUrlChange?.(event.target.value)}
              />
              <input
                type="text"
                className="hc-sync-input"
                placeholder="Calendar name"
                value={calendarNameInput}
                onChange={(event) => onCalendarNameChange?.(event.target.value)}
              />
              <select
                className="hc-sync-input hc-sync-input--select"
                value={String(calendarProviderInput || CALENDAR_PROVIDER.AUTO).toLowerCase()}
                onChange={(event) => onCalendarProviderChange?.(event.target.value)}
              >
                <option value={CALENDAR_PROVIDER.AUTO}>Provider (Auto detect)</option>
                <option value={CALENDAR_PROVIDER.AIRBNB}>Airbnb</option>
                <option value={CALENDAR_PROVIDER.BOOKING}>Booking.com</option>
                <option value={CALENDAR_PROVIDER.GENERIC}>Other</option>
              </select>
            </div>

            <button type="submit" className="hc-sync-add-btn" disabled={!canAddCalendar}>
              {addingCalendar ? "Adding..." : "+ Add calendar"}
            </button>
          </section>

          {!isEditingCalendar && addCalendarError ? <p className="hc-sync-error">{addCalendarError}</p> : null}

          {hasConnections ? renderConnectedSection() : null}

          <p className="hc-sync-meta">
            This is a two-way connection. <a href="/helpdesk-host">Need help?</a> Learn how it works.
          </p>
        </form>
      ) : (
        <section className="hc-sync-step">
          <h4 className="hc-sync-step-title">Connect calendars</h4>
          <p className="hc-sync-step-copy">Sync all your hosting calendars so they stay up to date.</p>
          <button
            type="button"
            className="hc-availability-connect-btn"
            onClick={() => setIsConnectionSetupOpen(true)}
          >
            <span className="hc-availability-connect-btn-label">
              <span className="hc-availability-connect-btn-icon" aria-hidden="true">
                <img src={calendarIcon} alt="" />
              </span>
              <span>Connect to another website</span>
            </span>
            <img src={arrowRightIcon} alt="" aria-hidden="true" className="hc-chevron-icon" />
          </button>
          {renderConnectedSection()}
        </section>
      )}

      {isEditingCalendar ? (
        <div
          className="hc-sync-edit-modal-backdrop"
          role="presentation"
          onClick={() => {
            if (!addingCalendar) {
              onCancelEdit?.();
            }
          }}
        >
          <section
            className="hc-sync-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Edit calendar connection"
            onClick={(event) => event.stopPropagation()}
          >
            <h4 className="hc-sync-edit-modal-title">Edit calendar connection</h4>
            <p className="hc-sync-edit-modal-copy">Update the link, name, or provider and save changes.</p>

            <div className="hc-sync-fields">
              <input
                type="text"
                className="hc-sync-input"
                placeholder="Other website link"
                value={externalCalendarUrlInput}
                onChange={(event) => onExternalCalendarUrlChange?.(event.target.value)}
              />
              <input
                type="text"
                className="hc-sync-input"
                placeholder="Calendar name"
                value={calendarNameInput}
                onChange={(event) => onCalendarNameChange?.(event.target.value)}
              />
              <select
                className="hc-sync-input hc-sync-input--select"
                value={String(calendarProviderInput || CALENDAR_PROVIDER.AUTO).toLowerCase()}
                onChange={(event) => onCalendarProviderChange?.(event.target.value)}
              >
                <option value={CALENDAR_PROVIDER.AUTO}>Provider (Auto detect)</option>
                <option value={CALENDAR_PROVIDER.AIRBNB}>Airbnb</option>
                <option value={CALENDAR_PROVIDER.BOOKING}>Booking.com</option>
                <option value={CALENDAR_PROVIDER.GENERIC}>Other</option>
              </select>
            </div>

            {addCalendarError ? <p className="hc-sync-error">{addCalendarError}</p> : null}

            <div className="hc-sync-edit-modal-actions">
              <button
                type="button"
                className="hc-sync-cancel-btn"
                disabled={addingCalendar}
                onClick={() => onCancelEdit?.()}
              >
                Cancel
              </button>
              <button
                type="button"
                className="hc-sync-add-btn"
                disabled={!canAddCalendar}
                onClick={() => onAddCalendar?.()}
              >
                {addingCalendar ? "Saving..." : "Save changes"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isConfirmingRemoval ? (
        <div
          className="hc-sync-remove-modal-backdrop"
          role="presentation"
          onClick={() => {
            if (!isRemovingPendingSource) {
              resetRemoveSourceFlow();
            }
          }}
        >
          <section
            className="hc-sync-remove-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Remove calendar connection"
            onClick={(event) => event.stopPropagation()}
          >
            {isRemoveReasonStep ? (
              <>
                <h4 className="hc-sync-remove-modal-title">Why are you disconnecting this calendar?</h4>
                <p className="hc-sync-remove-modal-copy">Choose all reasons that apply.</p>
                <div className="hc-sync-remove-reasons-list">
                  {REMOVE_SOURCE_REASONS.map((reason) => (
                    <label key={reason.id} className="hc-sync-remove-reason-row">
                      <input
                        type="checkbox"
                        className="hc-sync-remove-reason-checkbox"
                        checked={selectedRemoveReasonIdSet.has(reason.id)}
                        onChange={() => handleToggleRemoveReason(reason.id)}
                        disabled={isRemovingPendingSource}
                      />
                      <span>{reason.label}</span>
                    </label>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h4 className="hc-sync-remove-modal-title">Remove calendar connection?</h4>
                <p className="hc-sync-remove-modal-copy">
                  This will disconnect <strong>{pendingRemoveSourceName}</strong> from this accommodation.
                </p>
                <p className="hc-sync-remove-modal-copy">
                  You can re-add it later, but imported blocked dates from this source will stop syncing.
                </p>
              </>
            )}

            {addCalendarError ? <p className="hc-sync-error">{addCalendarError}</p> : null}

            <div className="hc-sync-remove-modal-actions">
              <button
                type="button"
                className="hc-sync-cancel-btn"
                disabled={isRemovingPendingSource}
                onClick={() => {
                  if (!isRemoveReasonStep) {
                    setRemoveSourceFlowStep(REMOVE_SOURCE_FLOW_STEP.REASON);
                    return;
                  }
                  resetRemoveSourceFlow();
                }}
              >
                {isRemoveReasonStep ? "Cancel" : "Back"}
              </button>
              <button
                type="button"
                className="hc-sync-remove-confirm-btn"
                disabled={
                  isRemovingPendingSource || (isRemoveReasonStep && !hasSelectedRemoveReason)
                }
                onClick={isRemoveReasonStep ? handleRemoveReasonsNext : handleConfirmRemoveSource}
              >
                {removeConfirmButtonLabel}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
