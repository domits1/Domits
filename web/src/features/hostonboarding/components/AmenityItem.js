import React from "react";

function AmenityItem({ amenity, checked, onChange }) {
  return (
    <label>
      <input
        type="checkbox"
        name={amenity.amenity}
        checked={checked}
        onChange={(e) => onChange(amenity)}
      />
      {amenity.amenity}
    </label>
  );
}

export default AmenityItem;