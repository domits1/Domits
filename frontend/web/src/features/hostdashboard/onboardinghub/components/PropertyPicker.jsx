import React from "react";
import PropTypes from "prop-types";

const PropertyPicker = ({ properties, selectedPropertyId, onSelect, label }) => (
  <div className="onboarding-property-picker">
    <label className="onboarding-property-picker-label" htmlFor="onboarding-property-select">
      {label}
    </label>
    <select
      id="onboarding-property-select"
      className="onboarding-property-picker-select"
      value={selectedPropertyId || ""}
      onChange={(event) => onSelect(event.target.value)}
    >
      {properties.map((property) => (
        <option key={property.propertyId} value={property.propertyId}>
          {property.title}
        </option>
      ))}
    </select>
  </div>
);

PropertyPicker.propTypes = {
  properties: PropTypes.arrayOf(
    PropTypes.shape({
      propertyId: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
    })
  ).isRequired,
  selectedPropertyId: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
};

PropertyPicker.defaultProps = {
  selectedPropertyId: null,
};

export default PropertyPicker;
