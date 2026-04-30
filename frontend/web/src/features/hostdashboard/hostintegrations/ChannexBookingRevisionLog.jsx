import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { ackChannexBookingRevisions, listChannexBookingRevisions } from "./channexApi";

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

  const propertyId = String(domitsPropertyId || "").trim();
  const selectedRevisionIdSet = useMemo(() => new Set(selectedRevisionIds), [selectedRevisionIds]);
  const canLoad = Boolean(userId && propertyId) && !loading && !ackLoading;
  const canAcknowledge = selectedRevisionIds.length > 0 && Boolean(userId && propertyId) && !loading && !ackLoading;

  const pruneSelectedRevisionIds = (nextRevisions) => {
    const selectableRevisionIds = new Set(
      nextRevisions
        .filter((revision) => revision?.revisionId && !isAcknowledged(revision.acknowledgementState))
        .map((revision) => revision.revisionId)
    );

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
    setSelectedRevisionIds((current) =>
      current.includes(revisionId) ? current.filter((value) => value !== revisionId) : [...current, revisionId]
    );
  };

  const acknowledgeSelectedRevisions = async () => {
    if (!canAcknowledge) return;

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
            className="host-integrations-secondary-btn"
            disabled={!canLoad}
            onClick={() => loadRevisions(false)}
          >
            {loadingMode === "plain" ? "Loading..." : "Load booking revisions"}
          </button>
          <button
            type="button"
            className="host-integrations-secondary-btn"
            disabled={!canLoad}
            onClick={() => loadRevisions(true)}
          >
            {loadingMode === "raw" ? "Loading raw..." : "Load with raw payload"}
          </button>
          <button
            type="button"
            className="host-integrations-primary-btn"
            disabled={!canAcknowledge}
            onClick={acknowledgeSelectedRevisions}
          >
            {ackLoading ? "Acknowledging..." : "Acknowledge selected revisions"}
          </button>
        </div>
      </div>

      {!userId || !propertyId ? (
        <p className="host-integrations-muted">Enter a Domits property ID before loading booking revisions.</p>
      ) : null}
      {listSuccess ? <p className="host-integrations-success-banner">{listSuccess}</p> : null}
      {ackSuccess ? <p className="host-integrations-success-banner">{ackSuccess}</p> : null}
      {listError ? <p className="host-integrations-error-banner">{listError}</p> : null}
      {ackError ? <p className="host-integrations-error-banner">{ackError}</p> : null}

      {hasLoaded && !revisions.length && !loading && !listError ? (
        <p className="host-integrations-muted">No Channex booking revisions were returned.</p>
      ) : null}
      {!hasLoaded ? (
        <p className="host-integrations-muted">Booking revisions are loaded only after an explicit button click.</p>
      ) : null}

      {revisions.length ? (
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
              {revisions.map((revision, index) => {
                const revisionId = revision?.revisionId || "";
                const acknowledged = isAcknowledged(revision?.acknowledgementState);
                const selectable = Boolean(revisionId) && !acknowledged;
                const rowKey = revision?.id || revisionId || `${revision?.externalReservationId || "revision"}-${index}`;

                return (
                  <tr key={rowKey}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Select Channex revision ${revisionId || index + 1}`}
                        checked={revisionId ? selectedRevisionIdSet.has(revisionId) : false}
                        disabled={!selectable}
                        onChange={() => toggleRevisionSelection(revisionId)}
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
                    {includeRawPayload ? (
                      <td>
                        {revision?.rawPayload === undefined || revision?.rawPayload === null ? (
                          <span className="host-integrations-muted">No raw payload returned.</span>
                        ) : (
                          <details className="channex-booking-revisions-raw">
                            <summary>Raw payload</summary>
                            <pre>{stringifyJson(revision.rawPayload)}</pre>
                          </details>
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

ChannexBookingRevisionLog.propTypes = {
  userId: PropTypes.string,
  domitsPropertyId: PropTypes.string,
};

export default ChannexBookingRevisionLog;
