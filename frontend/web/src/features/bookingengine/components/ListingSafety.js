import React from "react";
import PropTypes from "prop-types";
import "./ListingPolicySections.css";

const SAFETY_ITEMS = {
  smokeDetector: "Smoke detector",
  carbonMonoxideDetector: "Carbon monoxide detector",
  fireExtinguisher: "Fire extinguisher",
  firstAidKit: "First aid kit",
};

const ListingSafety = ({ features }) => {
  if (!features) return null;

  const activeFeatures = Object.keys(features).filter((key) => features[key] === true);
  if (activeFeatures.length === 0) return null;

  return (
    <div className="listing-policy-section">
      <h3 className="listing-policy-section-title">Safety & Property</h3>
      <ul className="listing-policy-section-list">
        {features.smokeDetector && <li className="listing-policy-section-list-item">✓ Smoke detector</li>}
        {features.carbonMonoxideDetector && (
          <li className="listing-policy-section-list-item">✓ Carbon monoxide detector</li>
        )}
        {features.fireExtinguisher && <li className="listing-policy-section-list-item">✓ Fire extinguisher</li>}
        {features.firstAidKit && <li className="listing-policy-section-list-item">✓ First aid kit</li>}
      </ul>
    </div>
  );
};

ListingSafety.propTypes = {
  features: PropTypes.object,
};

export default ListingSafety;
