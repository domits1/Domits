import React from "react";
import PropTypes from "prop-types";

function formatDateTime(ms) {
  if (!ms) return "—";
  return new Date(Number(ms)).toLocaleString("nl-NL");
}

function LastSyncCard({ syncEvidence = null }) {
  const item = syncEvidence?.item ?? null;

  if (!item) {
    return (
      <div className="chdist-card">
        <div className="chdist-card__row">
          <span className="chdist-card__name">Last sync</span>
          <span className="chdist-badge chdist-badge--pending">No sync yet</span>
        </div>
      </div>
    );
  }

  const tone = item.overallSuccess ? "success" : "error";
  const label = item.overallSuccess ? "Synced" : "Failed";

  return (
    <div className="chdist-card">
      <div className="chdist-card__row">
        <span className="chdist-card__name">Last sync</span>
        <span className={`chdist-badge chdist-badge--${tone}`}>{label}</span>
      </div>
      <p className="chdist-card__meta">{formatDateTime(item.finishedAt)}</p>
    </div>
  );
}

LastSyncCard.propTypes = {
  syncEvidence: PropTypes.shape({
    item: PropTypes.shape({
      overallSuccess: PropTypes.bool,
      finishedAt: PropTypes.number,
    }),
  }),
};

export default LastSyncCard;
