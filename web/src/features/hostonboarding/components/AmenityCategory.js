import React from "react";
import AmenityItem from "./AmenityItem";
import PropTypes from 'prop-types';
import "../styles/AmenityStyles.css";

function AmenityCategory({ category, amenities, selectedAmenities, handleAmenityChange }) {
    return (
        <div style={{ marginBottom: "20px" }}>
            <h2 className="amenity-header">{category}</h2>
            <section className="check-box">
                {amenities.map((amenity) => (
                    <AmenityItem
                        key={amenity}
                        category={category}
                        amenity={amenity}
                        checked={selectedAmenities.includes(amenity)}
                        onChange={handleAmenityChange}
                        className="amenity-item"
                    />
                ))}
            </section>
        </div>
    );
}

AmenityCategory.propTypes = {
    category: PropTypes.string.isRequired,
    amenities: PropTypes.arrayOf(PropTypes.string).isRequired,
    selectedAmenities: PropTypes.arrayOf(PropTypes.string).isRequired,
    handleAmenityChange: PropTypes.func.isRequired,
};

export default AmenityCategory;