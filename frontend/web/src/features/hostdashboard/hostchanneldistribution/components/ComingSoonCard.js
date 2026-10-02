import React from "react";
import PropTypes from "prop-types";

function ComingSoonCard({ title, description }) {
  return (
    <div className="chdist-card chdist-card--coming-soon">
      <div className="chdist-card__row">
        <span className="chdist-card__name">{title}</span>
        <span className="chdist-badge chdist-badge--pending">Coming soon</span>
      </div>
      <p className="chdist-card__meta">{description}</p>
    </div>
  );
}

ComingSoonCard.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
};

export default ComingSoonCard;
