import React from "react";
import PropTypes from "prop-types";
import { SYNC_HISTORY_STATE } from "../hooks/useSyncHistory";
import { formatDateTime } from "../utils/syncOutcome";

const LOADING_MESSAGE = "Loading the sync history…";
const EMPTY_MESSAGE = "No syncs yet for this property.";
const ERROR_MESSAGE = "We couldn't load the sync history.";

const describeCount = (count, noun) => (count > 0 ? `${count} ${noun}${count === 1 ? "" : "s"}` : "");

function SyncHistoryRow({ row }) {
  const counts = [describeCount(row.errorCount, "error"), describeCount(row.warningCount, "warning")]
    .filter(Boolean)
    .join(", ");

  return (
    <li className="chdist-history__item">
      <span className="chdist-history__date">{formatDateTime(row.startedAt)}</span>
      <span className="chdist-history__kind">{row.kind}</span>
      <span className={`chdist-badge chdist-badge--${row.tone}`}>{row.outcomeLabel}</span>
      {counts && <span className="chdist-history__counts">{counts}</span>}
    </li>
  );
}

const ROW_SHAPE = PropTypes.shape({
  id: PropTypes.string,
  startedAt: PropTypes.number,
  kind: PropTypes.string.isRequired,
  tone: PropTypes.string.isRequired,
  outcomeLabel: PropTypes.string.isRequired,
  warningCount: PropTypes.number.isRequired,
  errorCount: PropTypes.number.isRequired,
});

SyncHistoryRow.propTypes = { row: ROW_SHAPE.isRequired };

function SyncHistoryBody({ loadState, rows }) {
  if (loadState === SYNC_HISTORY_STATE.LOADING) {
    return (
      <p className="chdist-card__meta">
        <output>{LOADING_MESSAGE}</output>
      </p>
    );
  }
  if (loadState === SYNC_HISTORY_STATE.ERROR) {
    return (
      <p className="chdist-card__meta" role="alert">
        {ERROR_MESSAGE}
      </p>
    );
  }
  if (rows.length === 0) {
    return <p className="chdist-card__meta">{EMPTY_MESSAGE}</p>;
  }
  return (
    <ul className="chdist-history">
      {rows.map((row) => (
        <SyncHistoryRow key={row.id} row={row} />
      ))}
    </ul>
  );
}

SyncHistoryBody.propTypes = {
  loadState: PropTypes.string.isRequired,
  rows: PropTypes.arrayOf(ROW_SHAPE).isRequired,
};

function SyncHistoryCard({ propertyName, loadState, rows = [] }) {
  // An unavailable integration is explained by the status card.
  if (loadState === SYNC_HISTORY_STATE.IDLE || loadState === SYNC_HISTORY_STATE.UNAVAILABLE) return null;

  return (
    <div className="chdist-card">
      <span className="chdist-card__name">Sync history</span>
      <p className="chdist-card__meta">Property: {propertyName}</p>
      <SyncHistoryBody loadState={loadState} rows={rows} />
    </div>
  );
}

SyncHistoryCard.propTypes = {
  propertyName: PropTypes.string.isRequired,
  loadState: PropTypes.string.isRequired,
  rows: PropTypes.arrayOf(ROW_SHAPE),
};

export default SyncHistoryCard;
