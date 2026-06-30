import React from "react";
import PropTypes from "prop-types";
import SkeletonBlock from "./SkeletonBlock";

const Header = ({ title, rating, generalDetails, isLoading = false }) => {
  const detailParts = Array.isArray(generalDetails)
    ? generalDetails.map((d) => `${d.value} ${d.detail}`)
    : [];

  if (isLoading) {
    return (
      <section className="listing-details-header" aria-busy="true">
        <h2 className="title">
          <SkeletonBlock width="min(520px, 82vw)" height={28} />
        </h2>
        <div className="listing-details-header__meta">
          <SkeletonBlock width={92} height={16} />
          <SkeletonBlock width={140} height={16} />
          <SkeletonBlock width={118} height={16} />
        </div>
      </section>
    );
  }

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
        {detailParts.map((part) => (
          <span key={part} className="listing-details-header__detail">
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
  isLoading: PropTypes.bool,
  generalDetails: PropTypes.arrayOf(
    PropTypes.shape({
      detail: PropTypes.string,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    })
  ),
};

export default Header;
