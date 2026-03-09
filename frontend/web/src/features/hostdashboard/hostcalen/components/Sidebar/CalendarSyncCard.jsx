import React from "react";
import PropTypes from "prop-types";
import arrowLeftIcon from "../../../../../images/arrow-left-icon.svg";
import ConnectPromptSection from "./calendarSync/ConnectPromptSection";
import ConnectedSourcesSection from "./calendarSync/ConnectedSourcesSection";
import ConnectionSetupForm from "./calendarSync/ConnectionSetupForm";
import EditSourceModal from "./calendarSync/EditSourceModal";
import RemoveSourceModal from "./calendarSync/RemoveSourceModal";
import { REMOVE_SOURCE_FLOW_STEP, SOURCE_SYNC_STATE } from "./calendarSync/calendarSyncConstants";
import { calendarSourceShape, stringOrNumberProp } from "./calendarSync/calendarSyncPropTypes";
import { resolveSourceId } from "./calendarSync/calendarSyncUtils";

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
  sourceSyncStateById,
  onRefreshAllSources,
  refreshingAllSources,
  onRemoveSource,
  removingSourceId,
  onBack,
}) {
  const [isConnectionSetupOpen, setIsConnectionSetupOpen] = React.useState(false);
  const [pendingRemoveSourceId, setPendingRemoveSourceId] = React.useState("");
  const [removeSourceFlowStep, setRemoveSourceFlowStep] = React.useState(REMOVE_SOURCE_FLOW_STEP.REASON);
  const [selectedRemoveReasonIds, setSelectedRemoveReasonIds] = React.useState([]);
  const sources = Array.isArray(connectedSources) ? connectedSources : [];
  const syncStateMap =
    sourceSyncStateById && typeof sourceSyncStateById === "object" ? sourceSyncStateById : {};
  const hasConnections = sources.length > 0;
  const showConnectionSetup = !hasConnections || isConnectionSetupOpen;
  const isSyncingAllSources = Boolean(refreshingAllSources);
  const hasAnySourceSyncInProgress =
    Object.values(syncStateMap).some(
      (state) => state === SOURCE_SYNC_STATE.PENDING || state === SOURCE_SYNC_STATE.SYNCING
    ) || Boolean(String(refreshingSourceId || "").trim());
  const hasRefreshInProgress = isSyncingAllSources || hasAnySourceSyncInProgress;
  const isConfirmingRemoval = Boolean(String(pendingRemoveSourceId || "").trim());
  const isConnectionSetupOverlayOpen =
    hasConnections && showConnectionSetup && !isEditingCalendar && !isConfirmingRemoval;
  const isRemovingPendingSource =
    String(removingSourceId || "").trim() === String(pendingRemoveSourceId || "").trim();

  const pendingRemoveSource = React.useMemo(() => {
    const normalizedPendingSourceId = String(pendingRemoveSourceId || "").trim();
    if (!normalizedPendingSourceId) {
      return null;
    }

    return (
      sources.find((source, index) => resolveSourceId(source, index) === normalizedPendingSourceId) ||
      null
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
    const globalScope = globalThis;
    globalScope.addEventListener("keydown", handleKeyDown);
    return () => {
      globalScope.removeEventListener("keydown", handleKeyDown);
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
      const sourceId = resolveSourceId(source, index);
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

  const connectedSection = (
    <ConnectedSourcesSection
      sources={sources}
      syncStateMap={syncStateMap}
      removingSourceId={removingSourceId}
      editingSourceId={editingSourceId}
      onRefreshSource={onRefreshSource}
      onEditSource={onEditSource}
      onOpenRemoveSourceFlow={handleOpenRemoveSourceFlow}
      onRemoveSource={onRemoveSource}
      addingCalendar={addingCalendar}
      hasRefreshInProgress={hasRefreshInProgress}
      isConfirmingRemoval={isConfirmingRemoval}
      isSyncingAllSources={isSyncingAllSources}
    />
  );

  return (
    <>
      {isConnectionSetupOverlayOpen ? <div className="hc-sync-page-backdrop" aria-hidden="true" /> : null}
      <section
        className={`hc-sync-card ${isConnectionSetupOverlayOpen ? "hc-sync-card--focus-layer" : ""}`}
        aria-label="Sync calendars"
      >
        <header className="hc-sync-header">
          <button
            type="button"
            className="hc-sync-back"
            onClick={handleBack}
            aria-label={hasConnections && isConnectionSetupOpen ? "Back to sync overview" : "Back to summary"}
          >
            <img src={arrowLeftIcon} alt="" aria-hidden="true" className="hc-chevron-icon" />
          </button>
          {hasConnections ? (
            <button
              type="button"
              className="hc-sync-refresh-all"
              disabled={
                !onRefreshAllSources || addingCalendar || hasRefreshInProgress || isConfirmingRemoval
              }
              onClick={() => onRefreshAllSources?.()}
            >
              {isSyncingAllSources ? "Syncing all..." : "Sync all"}
            </button>
          ) : null}
        </header>

        <h3 className="hc-sync-title">Sync calendars</h3>
        <p className="hc-sync-copy">
          Keep your availability up-to-date across different platforms. Sync calendars to automatically
          reflect changes in bookings.
        </p>

        {showConnectionSetup ? (
          <ConnectionSetupForm
            canAddCalendar={canAddCalendar}
            onAddCalendar={onAddCalendar}
            domitsCalendarLink={domitsCalendarLink}
            domitsCalendarLinkCopied={domitsCalendarLinkCopied}
            onCopyDomitsCalendarLink={onCopyDomitsCalendarLink}
            externalCalendarUrlInput={externalCalendarUrlInput}
            onExternalCalendarUrlChange={onExternalCalendarUrlChange}
            calendarNameInput={calendarNameInput}
            onCalendarNameChange={onCalendarNameChange}
            calendarProviderInput={calendarProviderInput}
            onCalendarProviderChange={onCalendarProviderChange}
            addingCalendar={addingCalendar}
            isEditingCalendar={isEditingCalendar}
            addCalendarError={addCalendarError}
            hasConnections={hasConnections}
            connectedSection={connectedSection}
          />
        ) : (
          <ConnectPromptSection
            onOpenConnectionSetup={setIsConnectionSetupOpen}
            connectedSection={connectedSection}
          />
        )}

        <EditSourceModal
          isOpen={isEditingCalendar}
          addingCalendar={addingCalendar}
          onCancelEdit={onCancelEdit}
          externalCalendarUrlInput={externalCalendarUrlInput}
          onExternalCalendarUrlChange={onExternalCalendarUrlChange}
          calendarNameInput={calendarNameInput}
          onCalendarNameChange={onCalendarNameChange}
          calendarProviderInput={calendarProviderInput}
          onCalendarProviderChange={onCalendarProviderChange}
          addCalendarError={addCalendarError}
          canAddCalendar={canAddCalendar}
          onAddCalendar={onAddCalendar}
        />

        <RemoveSourceModal
          isOpen={isConfirmingRemoval}
          isRemovingPendingSource={isRemovingPendingSource}
          isRemoveReasonStep={isRemoveReasonStep}
          selectedRemoveReasonIdSet={selectedRemoveReasonIdSet}
          handleToggleRemoveReason={handleToggleRemoveReason}
          pendingRemoveSourceName={pendingRemoveSourceName}
          addCalendarError={addCalendarError}
          resetRemoveSourceFlow={resetRemoveSourceFlow}
          setRemoveSourceFlowStep={setRemoveSourceFlowStep}
          handleRemoveReasonsNext={handleRemoveReasonsNext}
          handleConfirmRemoveSource={handleConfirmRemoveSource}
          removeConfirmButtonLabel={removeConfirmButtonLabel}
          hasSelectedRemoveReason={hasSelectedRemoveReason}
        />
      </section>
    </>
  );
}

CalendarSyncCard.propTypes = {
  domitsCalendarLink: PropTypes.string,
  externalCalendarUrlInput: PropTypes.string,
  calendarNameInput: PropTypes.string,
  calendarProviderInput: PropTypes.string,
  onExternalCalendarUrlChange: PropTypes.func,
  onCalendarNameChange: PropTypes.func,
  onCalendarProviderChange: PropTypes.func,
  onCopyDomitsCalendarLink: PropTypes.func,
  domitsCalendarLinkCopied: PropTypes.bool,
  onAddCalendar: PropTypes.func,
  canAddCalendar: PropTypes.bool,
  addingCalendar: PropTypes.bool,
  addCalendarError: PropTypes.string,
  isEditingCalendar: PropTypes.bool,
  connectedSources: PropTypes.arrayOf(calendarSourceShape),
  onEditSource: PropTypes.func,
  editingSourceId: stringOrNumberProp,
  onCancelEdit: PropTypes.func,
  onRefreshSource: PropTypes.func,
  refreshingSourceId: stringOrNumberProp,
  sourceSyncStateById: PropTypes.objectOf(PropTypes.string),
  onRefreshAllSources: PropTypes.func,
  refreshingAllSources: PropTypes.bool,
  onRemoveSource: PropTypes.func,
  removingSourceId: stringOrNumberProp,
  onBack: PropTypes.func,
};
