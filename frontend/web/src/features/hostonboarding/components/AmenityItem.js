import React from "react";

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