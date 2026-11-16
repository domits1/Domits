import React from "react";
import PropTypes from "prop-types";
import { LATEST_SYNC_STATE } from "../hooks/useLatestSyncEvidence";

const LOADING_MESSAGE = "Loading the last sync…";
const NO_SYNC_MESSAGE = "No sync has run for this property yet.";
const ERROR_MESSAGE = "We couldn't load the last sync.";

// Evidence statuses that are neither a success nor a failure. Both are written on every sync
// attempt that had nothing to send or was not ready. Any other unknown status falls back to the
// warnings outcome.
const NEUTRAL_OUTCOMES = {
  BLOCKED: { label: "Blocked", describe: (date) => `Last sync was blocked on ${date}.` },
  NOOP: { label: "Nothing to send", describe: (date) => `Last sync had nothing to send on ${date}.` },
};

function formatDateTime(ms) {
  if (!ms) return "—";
  return new Date(Number(ms)).toLocaleString("nl-NL");
}

// The first rule that matches wins.
function describeOutcome(item) {
  if (item.finishedAt === null || item.finishedAt === undefined) {
    const sentence = item.startedAt
      ? `Last sync started on ${formatDateTime(item.startedAt)} and has not finished.`
      : "Last sync has not finished.";
    return { tone: "pending", label: "Not finished", sentence };
  }

  const finishedOn = formatDateTime(item.finishedAt);

  if (item.overallSuccess) {
    return { tone: "success", label: "Synced", sentence: `Last sync succeeded on ${finishedOn}.` };
  }
  if (item.errorCount > 0 || item.status === "FAILED") {
    return { tone: "error", label: "Failed", sentence: `Last sync failed on ${finishedOn}.` };
  }

  const neutral = NEUTRAL_OUTCOMES[item.status];
  if (neutral) {
    return { tone: "pending", label: neutral.label, sentence: neutral.describe(finishedOn) };
  }
  return { tone: "pending", label: "Warnings", sentence: `Last sync finished with warnings on ${finishedOn}.` };
}

function LastSyncCardBody({ loadState, item }) {
  if (loadState === LATEST_SYNC_STATE.LOADING) {
    return (
      <p className="chdist-card__meta">
        <output>{LOADING_MESSAGE}</output>
      </p>
    );
  }
  if (loadState === LATEST_SYNC_STATE.ERROR) {
    return (
      <p className="chdist-card__meta" role="alert">
        {ERROR_MESSAGE}
      </p>
    );
  }
  return <p className="chdist-card__meta">{item ? describeOutcome(item).sentence : NO_SYNC_MESSAGE}</p>;
}

const ITEM_SHAPE = PropTypes.shape({
  status: PropTypes.string,
  overallSuccess: PropTypes.bool,
  startedAt: PropTypes.number,
  finishedAt: PropTypes.number,
  errorCount: PropTypes.number,
});

LastSyncCardBody.propTypes = {
  loadState: PropTypes.string.isRequired,
  item: ITEM_SHAPE,
};

function LastSyncCard({ propertyName, loadState, item = null }) {
  // Without a request there is nothing to say, and an unavailable integration is explained by the status card.
  if (loadState === LATEST_SYNC_STATE.IDLE || loadState === LATEST_SYNC_STATE.UNAVAILABLE) return null;

  const isLoaded = loadState === LATEST_SYNC_STATE.LOADED;
  const badge = item ? describeOutcome(item) : { tone: "pending", label: "No sync yet" };

  return (
    <div className="chdist-card">
      <div className="chdist-card__row">
        <span className="chdist-card__name">Last sync</span>
        {isLoaded && <span className={`chdist-badge chdist-badge--${badge.tone}`}>{badge.label}</span>}
      </div>
      <p className="chdist-card__meta">Property: {propertyName}</p>
      <LastSyncCardBody loadState={loadState} item={item} />
    </div>
  );
}

LastSyncCard.propTypes = {
  propertyName: PropTypes.string.isRequired,
  loadState: PropTypes.string.isRequired,
  item: ITEM_SHAPE,
};

export default LastSyncCard;
