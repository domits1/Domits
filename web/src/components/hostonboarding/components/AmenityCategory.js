import React from "react";
import AmenityItem from "./AmenityItem";

function AmenityCategory({ category, amenities, selectedAmenities, handleAmenityChange }) {
  return (
    <div
      style={{
        marginBottom: "5%",
        boxShadow: "inset 0 0 20px 10px #dedede",
        padding: "5%",
        borderRadius: "2rem",
      }}
    >
      <h2 className="amenity-header">{category}</h2>
      <section className="check-box">
        {amenities.map((amenity) => (
          <AmenityItem
            key={amenity}
            category={category}
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