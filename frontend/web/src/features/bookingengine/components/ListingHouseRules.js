import React from "react";
import PropTypes from "prop-types";
import "./ListingPolicySections.css";

const ListingHouseRules = ({ rules }) => {
  if (!rules) return null;

  const hasRules =
    rules.childrenAllowed ||
    rules.smokingAllowed !== undefined ||
    rules.petsAllowed ||
    rules.partiesAllowed !== undefined ||
    rules.quietHours ||
    rules.maxGuests;

  if (!hasRules) return null;

  return (
    <div className="listing-policy-section">
      <h3 className="listing-policy-section-title">House Rules</h3>
      <ul className="listing-policy-section-list">
        {rules.childrenAllowed && <li className="listing-policy-section-list-item">✓ Children allowed</li>}
        {rules.smokingAllowed === false && <li className="listing-policy-section-list-item">✗ No smoking</li>}
        {rules.petsAllowed && <li className="listing-policy-section-list-item">✓ Pets allowed</li>}
        {rules.partiesAllowed === false && <li className="listing-policy-section-list-item">✗ No parties or events</li>}
        {rules.quietHours && <li className="listing-policy-section-list-item">🔇 Quiet hours: {rules.quietHours}</li>}
        {rules.maxGuests > 0 && (
          <li className="listing-policy-section-list-item">👥 Maximum guests: {rules.maxGuests}</li>
        )}
      </ul>
    </div>
  );
};

ListingHouseRules.propTypes = {
  rules: PropTypes.object,
};

export default ListingHouseRules;
