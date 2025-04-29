import React from "react";
import AmenityItem from "./AmenityItem";

function AmenityCategory({ category, amenities, selectedAmenities, handleAmenityChange }) {
  return (
    <div>
      <h2 className="amenity-header">{category}</h2>
      <section className="check-box">
        {amenities.map((amenity) => (
          <AmenityItem
            key={amenity.amenity}
            amenity={amenity}
            checked={selectedAmenities.includes(amenity)}
            onChange={handleAmenityChange}
          />
        ))}
      </section>
    </div>
  );
}

export default AmenityCategory;