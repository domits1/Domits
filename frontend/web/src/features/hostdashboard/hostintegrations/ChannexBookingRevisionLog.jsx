import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { ackChannexBookingRevisions, listChannexBookingRevisions, pullLatestChannexBookings } from "./channexApi";

const DEFAULT_LIMIT = "50";
const LIMIT_OPTIONS = ["25", "50", "100"];

const isAcknowledged = (value) => String(value || "").trim().toUpperCase() === "ACKNOWLEDGED";

const formatDateTime = (value) => {
  if (!value) return "-";
  const numericValue = Number(value);
  const date = new Date(Number.isFinite(numericValue) ? numericValue : value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const renderValue = (value) => {
  if (value === undefined || value === null || value === "") return "-";
  return String(value);
};

const stringifyJson = (value) => JSON.stringify(value ?? null, null, 2);

const pluralizeRevision = (count) => `${count} booking revision${count === 1 ? "" : "s"}`;
const formatIssueMessage = (issue) => {
  if (!issue || typeof issue !== "object") return renderValue(issue);
  const code = issue.code || issue.errorCode || issue.reason || "WARNING";
  const message = issue.message || issue.errorMessage || issue.details || "";
  return message ? `${code}: ${message}` : String(code);
};
const stringifyIssueKey = (issue) => {
  if (!issue || typeof issue !== "object") return renderValue(issue);
  return JSON.stringify({
    code: issue.code || issue.errorCode || issue.reason || null,
    message: issue.message || issue.errorMessage || issue.details || null,
  });
};
const buildIssueListItems = (issues, keyPrefix) => {
  const seenCountsByKey = new Map();
  return issues.map((issue) => {
    const baseKey = stringifyIssueKey(issue);
    const nextCount = (seenCountsByKey.get(baseKey) || 0) + 1;
    seenCountsByKey.set(baseKey, nextCount);
    return {
      key: `${keyPrefix}-${baseKey}-${nextCount}`,
      message: formatIssueMessage(issue),
    };
  });
};

const getRevisionRowKey = (revision, revisionId, index) =>
  revision?.id || revisionId || `${revision?.externalReservationId || "revision"}-${index}`;
const getSelectableRevisionIds = (nextRevisions) =>
  new Set(
    nextRevisions
      .filter((revision) => revision?.revisionId && isAcknowledged(revision.acknowledgementState) === false)
      .map((revision) => revision.revisionId)
  );
const toggleRevisionIdSelection = (current, revisionId) => {
  if (current.includes(revisionId)) return current.filter((value) => value !== revisionId);
  return [...current, revisionId];
};
const getRevisionLogUiState = ({
  userId,
  propertyId,
  loading,
  ackLoading,
  pullLoading,
  selectedRevisionIds,
  hasLoaded,
  revisions,
  listError,
}) => {
  const hasPropertyContext = Boolean(userId && propertyId);
  const isIdle = loading === false && ackLoading === false && pullLoading === false;
  return {
    canLoad: hasPropertyContext && isIdle,
    canPull: hasPropertyContext && isIdle,
    canAcknowledge: selectedRevisionIds.length > 0 && hasPropertyContext && isIdle,
    shouldShowMissingContext: hasPropertyContext === false,
    shouldShowEmptyState: hasLoaded && revisions.length === 0 && loading === false && listError === "",
    shouldShowInitialState: hasLoaded === false,
  };
};

function RevisionRawPayloadCell({ rawPayload }) {
  const hasRawPayload = rawPayload !== undefined && rawPayload !== null;

  return (
    <td>
      {hasRawPayload ? (
        <details className="channex-booking-revisions-raw">
          <summary>Raw payload</summary>
          <pre>{stringifyJson(rawPayload)}</pre>
        </details>
      ) : (
        <span className="host-integrations-muted">No raw payload returned.</span>
      )}
    </td>
  );
}

RevisionRawPayloadCell.propTypes = {
  rawPayload: PropTypes.oneOfType([
    PropTypes.array,
    PropTypes.bool,
    PropTypes.number,
    PropTypes.object,
    PropTypes.string,
  ]),
};

function RevisionRow({ revision, index, includeRawPayload, selectedRevisionIdSet, onToggleRevisionSelection }) {
  const revisionId = revision?.revisionId || "";
  const acknowledged = isAcknowledged(revision?.acknowledgementState);
  const selectable = Boolean(revisionId) && acknowledged === false;

  return (
    <tr>
      <td>
        <input
          type="checkbox"
          aria-label={`Select Channex revision ${revisionId || index + 1}`}
          checked={revisionId ? selectedRevisionIdSet.has(revisionId) : false}
          disabled={selectable === false}
          onChange={() => onToggleRevisionSelection(revisionId)}
        />
      </td>
      <td>{renderValue(revisionId)}</td>
      <td>{renderValue(revision?.externalReservationId)}</td>
      <td>{renderValue(revision?.bookingStatus)}</td>
      <td>{renderValue(revision?.arrivalDate)}</td>
      <td>{renderValue(revision?.departureDate)}</td>
      <td>{renderValue(revision?.guestSummary)}</td>
      <td>{renderValue(revision?.acknowledgementState)}</td>
      <td>{formatDateTime(revision?.acknowledgedAt)}</td>
      <td>{formatDateTime(revision?.createdAt)}</td>
      <td>{formatDateTime(revision?.updatedAt)}</td>
      {includeRawPayload ? <RevisionRawPayloadCell rawPayload={revision?.rawPayload} /> : null}
    </tr>
  );
}

RevisionRow.propTypes = {
  revision: PropTypes.object,
  index: PropTypes.number.isRequired,
  includeRawPayload: PropTypes.bool.isRequired,
  selectedRevisionIdSet: PropTypes.instanceOf(Set).isRequired,
  onToggleRevisionSelection: PropTypes.func.isRequired,
};

function RevisionMessages({
  shouldShowMissingContext,
  listSuccess,
  ackSuccess,
  listError,
  ackError,
  shouldShowEmptyState,
  shouldShowInitialState,
}) {
  return (
    <>
      {shouldShowMissingContext ? (
        <p className="host-integrations-muted">Enter a Domits property ID before loading booking revisions.</p>
      ) : null}
      {listSuccess ? <p className="host-integrations-success-banner">{listSuccess}</p> : null}
      {ackSuccess ? <p className="host-integrations-success-banner">{ackSuccess}</p> : null}
      {listError ? <p className="host-integrations-error-banner">{listError}</p> : null}
      {ackError ? <p className="host-integrations-error-banner">{ackError}</p> : null}

      {shouldShowEmptyState ? (
        <p className="host-integrations-muted">No Channex booking revisions were returned.</p>
      ) : null}
      {shouldShowInitialState ? (
        <p className="host-integrations-muted">Booking revisions are loaded only after an explicit button click.</p>
      ) : null}
    </>
  );
}

RevisionMessages.propTypes = {
  shouldShowMissingContext: PropTypes.bool.isRequired,
  listSuccess: PropTypes.string.isRequired,
  ackSuccess: PropTypes.string.isRequired,
  listError: PropTypes.string.isRequired,
  ackError: PropTypes.string.isRequired,
  shouldShowEmptyState: PropTypes.bool.isRequired,
  shouldShowInitialState: PropTypes.bool.isRequired,
};

function RevisionTable({ revisions, includeRawPayload, selectedRevisionIdSet, onToggleRevisionSelection }) {
  if (!revisions.length) return null;

  return (
    <div className="channex-diagnostics-table-wrap channex-booking-revisions-table-wrap">
      <table className="channex-diagnostics-table channex-booking-revisions-table">
        <thead>
          <tr>
            <th className="channex-booking-revisions-select">Select</th>
            <th>Revision ID</th>
            <th>External reservation ID</th>
            <th>Status</th>
            <th>Arrival</th>
            <th>Departure</th>
            <th>Guest summary</th>
            <th>Ack state</th>
            <th>Acknowledged</th>
            <th>Created</th>
            <th>Updated</th>
            {includeRawPayload ? <th>Internal diagnostic data</th> : null}
          </tr>
        </thead>
        <tbody>
          {revisions.map((revision, index) => (
            <RevisionRow
              key={getRevisionRowKey(revision, revision?.revisionId || "", index)}
              revision={revision}
              index={index}
              includeRawPayload={includeRawPayload}
              selectedRevisionIdSet={selectedRevisionIdSet}
              onToggleRevisionSelection={onToggleRevisionSelection}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

RevisionTable.propTypes = {
  revisions: PropTypes.arrayOf(PropTypes.object).isRequired,
  includeRawPayload: PropTypes.bool.isRequired,
  selectedRevisionIdSet: PropTypes.instanceOf(Set).isRequired,
  onToggleRevisionSelection: PropTypes.func.isRequired,
};

function PullResultSummary({ result }) {
  if (!result) return null;
  const warnings = Array.isArray(result.warnings) ? result.warnings : [];
  const errors = Array.isArray(result.errors) ? result.errors : [];
  const warningItems = buildIssueListItems(warnings, "pull-warning");
  const errorItems = buildIssueListItems(errors, "pull-error");

  return (
    <section className="channex-payload-summary-panel">
      <h4>Pull latest Channex bookings summary</h4>
      <dl className="channex-diagnostics-detail-grid">
        <div>
          <dt>Fetched</dt>
          <dd>{renderValue(result.fetchedCount)}</dd>
        </div>
        <div>
          <dt>Raw persisted</dt>
          <dd>{renderValue(result.rawPersistedCount)}</dd>
        </div>
        <div>
          <dt>Created bookings</dt>
          <dd>{renderValue(result.createdBookingCount)}</dd>
        </div>
        <div>
          <dt>Updated bookings</dt>
          <dd>{renderValue(result.updatedBookingCount)}</dd>
        </div>
        <div>
          <dt>Cancelled bookings</dt>
          <dd>{renderValue(result.cancelledBookingCount)}</dd>
        </div>
        <div>
          <dt>Skipped</dt>
          <dd>{renderValue(result.skippedCount)}</dd>
        </div>
        <div>
          <dt>Acked</dt>
          <dd>{renderValue(result.ackedCount)}</dd>
        </div>
        <div>
          <dt>Unacked</dt>
          <dd>{renderValue(result.unackedCount)}</dd>
        </div>
      </dl>
      {warnings.length ? (
        <div className="host-integrations-warning-banner">
          <strong>Warnings</strong>
          <ul className="channex-diagnostics-list">
            {warningItems.map((warning) => (
              <li key={warning.key}>{warning.message}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {errors.length ? (
        <div className="host-integrations-error-banner">
          <strong>Errors</strong>
          <ul className="channex-diagnostics-list">
            {errorItems.map((error) => (
              <li key={error.key}>{error.message}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <details className="channex-diagnostics-collapsible">
        <summary>Raw pull response JSON</summary>
        <pre>{stringifyJson(result)}</pre>
      </details>
    </section>
  );
}

PullResultSummary.propTypes = {
  result: PropTypes.object,
};

function ChannexBookingRevisionLog({ userId, domitsPropertyId }) {
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [includeRawPayload, setIncludeRawPayload] = useState(false);
  const [revisions, setRevisions] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState("");
  const [listError, setListError] = useState("");
  const [listSuccess, setListSuccess] = useState("");
  const [selectedRevisionIds, setSelectedRevisionIds] = useState([]);
  const [ackLoading, setAckLoading] = useState(false);
  const [ackError, setAckError] = useState("");
  const [ackSuccess, setAckSuccess] = useState("");
  const [pullLoading, setPullLoading] = useState(false);
  const [pullError, setPullError] = useState("");
  const [pullSuccess, setPullSuccess] = useState("");
  const [pullResult, setPullResult] = useState(null);

  const propertyId = String(domitsPropertyId || "").trim();
  const selectedRevisionIdSet = useMemo(() => new Set(selectedRevisionIds), [selectedRevisionIds]);
  const uiState = getRevisionLogUiState({
    userId,
    propertyId,
    loading,
    ackLoading,
    pullLoading,
    selectedRevisionIds,
    hasLoaded,
    revisions,
    listError,
  });

  const pruneSelectedRevisionIds = (nextRevisions) => {
    const selectableRevisionIds = getSelectableRevisionIds(nextRevisions);
    setSelectedRevisionIds((current) => current.filter((revisionId) => selectableRevisionIds.has(revisionId)));
  };

  const loadRevisions = async (nextIncludeRawPayload) => {
    const shouldIncludeRawPayload = nextIncludeRawPayload === true;
    setLoading(true);
    setLoadingMode(shouldIncludeRawPayload ? "raw" : "plain");
    setListError("");
    setListSuccess("");
    setAckError("");
    setAckSuccess("");

    try {
      const data = await listChannexBookingRevisions({
        userId,
        domitsPropertyId: propertyId,
        limit,
        includeRawPayload: shouldIncludeRawPayload,
      });
      const nextRevisions = Array.isArray(data?.revisions) ? data.revisions : [];
      setRevisions(nextRevisions);
      setIncludeRawPayload(shouldIncludeRawPayload);
      setHasLoaded(true);
      setListSuccess(`Loaded ${pluralizeRevision(nextRevisions.length)}.`);
      pruneSelectedRevisionIds(nextRevisions);
      return nextRevisions;
    } catch (error) {
      setListError(error?.message || "Booking revisions could not be loaded.");
      setRevisions([]);
      setHasLoaded(true);
      setSelectedRevisionIds([]);
      return [];
    } finally {
      setLoading(false);
      setLoadingMode("");
    }
  };

  const toggleRevisionSelection = (revisionId) => {
    setSelectedRevisionIds((current) => toggleRevisionIdSelection(current, revisionId));
  };

  const acknowledgeSelectedRevisions = async () => {
    if (uiState.canAcknowledge === false) return;

    const revisionIdsToAcknowledge = [...selectedRevisionIds];
    setAckLoading(true);
    setAckError("");
    setAckSuccess("");

    try {
      await ackChannexBookingRevisions({
        userId,
        domitsPropertyId: propertyId,
        revisionIds: revisionIdsToAcknowledge,
      });
      setSelectedRevisionIds([]);
      await loadRevisions(includeRawPayload);
      setAckSuccess(`Acknowledged ${pluralizeRevision(revisionIdsToAcknowledge.length)}.`);
    } catch (error) {
      setAckError(error?.message || "Selected booking revisions could not be acknowledged.");
    } finally {
      setAckLoading(false);
    }
  };

  const pullLatestBookings = async () => {
    if (uiState.canPull === false) return;

    setPullLoading(true);
    setPullError("");
    setPullSuccess("");
    setAckError("");
    setAckSuccess("");

    try {
      const data = await pullLatestChannexBookings({
        userId,
        domitsPropertyId: propertyId,
      });
      setPullResult(data);
      setPullSuccess("Pulled latest Channex bookings.");
      await loadRevisions(includeRawPayload);
    } catch (error) {
      setPullError(error?.message || "Latest Channex bookings could not be pulled.");
    } finally {
      setPullLoading(false);
    }
  };

  return (
    <section className="channex-diagnostics-card">
      <div className="channex-diagnostics-card-header">
        <div>
          <h3>Booking revision log</h3>
          <p className="host-integrations-muted">
            Stored Channex reservation revisions for this mapped Domits property.
          </p>
        </div>
      </div>

      <div className="channex-booking-revisions-controls">
        <label className="host-integrations-field channex-booking-revisions-limit">
          <span>Limit</span>
          <select value={limit} onChange={(event) => setLimit(event.target.value)}>
            {LIMIT_OPTIONS.map((option) => (
              <option value={option} key={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div className="channex-diagnostics-actions">
          <button
            type="button"
            className="host-integrations-primary-btn"
            disabled={uiState.canPull === false}
            onClick={pullLatestBookings}
          >
            {pullLoading ? "Pulling..." : "Pull latest Channex bookings"}
          </button>
          <button
            type="button"
            className="host-integrations-secondary-btn"
            disabled={uiState.canLoad === false}
            onClick={() => loadRevisions(false)}
          >
            {loadingMode === "plain" ? "Loading..." : "Load booking revisions"}
          </button>
          <button
            type="button"
            className="host-integrations-secondary-btn"
            disabled={uiState.canLoad === false}
            onClick={() => loadRevisions(true)}
          >
            {loadingMode === "raw" ? "Loading raw..." : "Load with raw payload"}
          </button>
          <button
            type="button"
            className="host-integrations-primary-btn"
            disabled={uiState.canAcknowledge === false}
            onClick={acknowledgeSelectedRevisions}
          >
            {ackLoading ? "Acknowledging..." : "Acknowledge selected revisions"}
          </button>
        </div>
      </div>

      <RevisionMessages
        shouldShowMissingContext={uiState.shouldShowMissingContext}
        listSuccess={listSuccess}
        ackSuccess={pullSuccess || ackSuccess}
        listError={listError}
        ackError={pullError || ackError}
        shouldShowEmptyState={uiState.shouldShowEmptyState}
        shouldShowInitialState={uiState.shouldShowInitialState}
      />

      <PullResultSummary result={pullResult} />

      <RevisionTable
        revisions={revisions}
        includeRawPayload={includeRawPayload}
        selectedRevisionIdSet={selectedRevisionIdSet}
        onToggleRevisionSelection={toggleRevisionSelection}
      />
    </section>
  );
}

ChannexBookingRevisionLog.propTypes = {
  userId: PropTypes.string,
  domitsPropertyId: PropTypes.string,
};

export default ChannexBookingRevisionLog;
