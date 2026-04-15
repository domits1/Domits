import React from "react";
import PropTypes from "prop-types";
import "./ListingPolicySections.css";

const ListingPropertyRules = ({ rules }) => {
  if (!rules) return null;

  const hasRules =
    rules.cookingAllowed || rules.parkingAvailable || (rules.customRules && rules.customRules.length > 0);
  if (!hasRules) return null;

  return (
    <div className="listing-policy-section">
      <h3 className="listing-policy-section-title">Property Rules</h3>
      <ul className="listing-policy-section-list">
        {rules.cookingAllowed && <li className="listing-policy-section-list-item">✓ Cooking allowed</li>}
        {rules.parkingAvailable && <li className="listing-policy-section-list-item">✓ Parking available</li>}
        {rules.customRules?.map((rule, idx) => (
          <li key={`${rule}-${idx}`} className="listing-policy-section-list-item">
            • {rule}
          </li>
        ))}
      </ul>
    </div>
  );
};

ListingPropertyRules.propTypes = {
  rules: PropTypes.object,
};

export default ListingPropertyRules;
