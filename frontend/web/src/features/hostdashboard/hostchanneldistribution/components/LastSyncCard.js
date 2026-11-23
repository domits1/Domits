import React from "react";
import PropTypes from "prop-types";
import { LATEST_SYNC_STATE } from "../hooks/useLatestSyncEvidence";
import { describeSyncOutcome } from "../utils/syncOutcome";

const LOADING_MESSAGE = "Loading the last sync…";
const NO_SYNC_MESSAGE = "No sync has run for this property yet.";
const ERROR_MESSAGE = "We couldn't load the last sync.";

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
  return <p className="chdist-card__meta">{item ? describeSyncOutcome(item).sentence : NO_SYNC_MESSAGE}</p>;
}

const ITEM_SHAPE = PropTypes.shape({
  status: PropTypes.string,
  overallSuccess: PropTypes.bool,
  startedAt: PropTypes.number,
  finishedAt: PropTypes.number,
  warningCount: PropTypes.number,
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
  const badge = item ? describeSyncOutcome(item) : { tone: "pending", label: "No sync yet" };

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
