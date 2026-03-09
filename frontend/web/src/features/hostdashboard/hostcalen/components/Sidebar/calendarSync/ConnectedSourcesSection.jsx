import React from "react";
import PropTypes from "prop-types";
import { CALENDAR_PROVIDER, resolveCalendarProviderFromSource } from "../../../hooks/hostCalendarHelpers";
import { SOURCE_SYNC_STATE } from "./calendarSyncConstants";
import { calendarSourceShape, stringOrNumberProp } from "./calendarSyncPropTypes";
import {
  formatLastSyncLabel,
  getProviderIcon,
  resolveSourceId,
  resolveSourceName,
  resolveSourceSyncButtonLabel,
  resolveSourceSyncStatusLabel,
} from "./calendarSyncUtils";

export default function ConnectedSourcesSection({
  sources,
  syncStateMap,
  removingSourceId,
  editingSourceId,
  onRefreshSource,
  onEditSource,
  onOpenRemoveSourceFlow,
  onRemoveSource,
  addingCalendar,
  hasRefreshInProgress,
  isConfirmingRemoval,
  isSyncingAllSources,
}) {
  return (
    <section className="hc-sync-connected">
      <p className="hc-sync-connected-title">Connected calendars</p>
      <ul className="hc-sync-connected-list">
        {sources.map((source, index) => {
          const sourceId = resolveSourceId(source, index);
          const sourceName = resolveSourceName(source);
          const isRemoving = String(removingSourceId || "") === sourceId;
          const sourceSyncState = String(syncStateMap[sourceId] || SOURCE_SYNC_STATE.IDLE);
          const displaySyncState =
            isSyncingAllSources && sourceSyncState === SOURCE_SYNC_STATE.PENDING
              ? SOURCE_SYNC_STATE.SYNCING
              : sourceSyncState;
          const isEditing = String(editingSourceId || "") === sourceId;
          const provider = resolveCalendarProviderFromSource(source);
          const providerIcon = getProviderIcon(provider);
          const isProviderIcon = provider !== CALENDAR_PROVIDER.GENERIC;
          const syncActionClassName = [
            "hc-sync-source-action",
            displaySyncState === SOURCE_SYNC_STATE.SYNCING && "is-active",
            displaySyncState === SOURCE_SYNC_STATE.SUCCESS && "is-success",
            displaySyncState === SOURCE_SYNC_STATE.ERROR && "is-error",
          ]
            .filter(Boolean)
            .join(" ");
          const sourceSyncStatusClassName = [
            "hc-sync-connected-card-status",
            displaySyncState !== SOURCE_SYNC_STATE.IDLE &&
              `hc-sync-connected-card-status--${displaySyncState}`,
          ]
            .filter(Boolean)
            .join(" ");

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
                  <p className={sourceSyncStatusClassName}>
                    {resolveSourceSyncStatusLabel(displaySyncState)}
                  </p>
                  <p className="hc-sync-connected-card-meta">{formatLastSyncLabel(source?.lastSyncAt)}</p>
                </div>
              </div>
              <div className="hc-sync-connected-card-actions">
                <button
                  type="button"
                  className={syncActionClassName}
                  disabled={
                    !onRefreshSource ||
                    addingCalendar ||
                    hasRefreshInProgress ||
                    isRemoving ||
                    isConfirmingRemoval
                  }
                  onClick={() => onRefreshSource?.(sourceId)}
                >
                  {resolveSourceSyncButtonLabel(displaySyncState)}
                </button>
                <button
                  type="button"
                  className={`hc-sync-source-action ${isEditing ? "is-active" : ""}`}
                  disabled={!onEditSource || addingCalendar || hasRefreshInProgress || isRemoving}
                  onClick={() => onEditSource?.(sourceId)}
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
                  onClick={() => onOpenRemoveSourceFlow(sourceId)}
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
}

ConnectedSourcesSection.propTypes = {
  sources: PropTypes.arrayOf(calendarSourceShape),
  syncStateMap: PropTypes.objectOf(PropTypes.string),
  removingSourceId: stringOrNumberProp,
  editingSourceId: stringOrNumberProp,
  onRefreshSource: PropTypes.func,
  onEditSource: PropTypes.func,
  onOpenRemoveSourceFlow: PropTypes.func,
  onRemoveSource: PropTypes.func,
  addingCalendar: PropTypes.bool,
  hasRefreshInProgress: PropTypes.bool,
  isConfirmingRemoval: PropTypes.bool,
  isSyncingAllSources: PropTypes.bool,
};
