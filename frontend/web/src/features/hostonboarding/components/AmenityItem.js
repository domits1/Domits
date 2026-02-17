import React from "react";
import PropTypes from "prop-types";

function AmenityItem({ amenity, checked, onChange }) {
  return (
    <label className="amenity-item">
      <input
        type="checkbox"
        name={amenity.amenity}
        checked={checked}
        onChange={(e) => onChange(amenity)}
        className="amenity-checkbox"
      />
      <span className="amenity-label">{amenity.amenity}</span>
    </label>
  );
}

export default AmenityItem;

AmenityItem.propTypes = {
  amenity: PropTypes.shape({
    amenity: PropTypes.string.isRequired,
  }).isRequired,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};
