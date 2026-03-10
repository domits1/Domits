import React from "react";
import AmenityItem from "./AmenityItem";

function AmenityCategory({ category, amenities, selectedAmenities, handleAmenityChange }) {
  return (
    <div className="amenity-card">
      <h3 className="amenity-card-title">{category}</h3>
      <section className="amenity-list">
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