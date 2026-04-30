import React from "react";
import PropTypes from "prop-types";

const Header = ({ title, rating, generalDetails }) => {
  const detailParts = Array.isArray(generalDetails)
    ? generalDetails.map((d) => `${d.value} ${d.detail}`)
    : [];

  return (
    <section className="listing-details-header">
      <h2 className="title">{title}</h2>
      <div className="listing-details-header__meta">
        {rating != null && (
          <span className="listing-details-header__rating">
            <span className="listing-details-header__star">⭐</span>
            {Number(rating).toFixed(1)}
          </span>
        )}
        {detailParts.map((part, i) => (
          <span key={i} className="listing-details-header__detail">
            <span className="listing-details-header__dot" aria-hidden="true">·</span>
            {part}
          </span>
        ))}
      </div>
    </section>
  );
};

Header.propTypes = {
  title: PropTypes.string,
  rating: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  generalDetails: PropTypes.arrayOf(
    PropTypes.shape({ detail: PropTypes.string, value: PropTypes.string })
  ),
};

export default Header;
