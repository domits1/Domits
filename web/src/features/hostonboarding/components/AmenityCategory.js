import React from 'react';
import AmenityItem from './AmenityItem';
import PropTypes from 'prop-types';

// Receive the prop as handleAmenityChange
function AmenityCategory({ category, amenities, selectedAmenities, handleAmenityChange }) {
    // Add the safety check from before, just in case
    if (typeof category !== 'string' || category.length === 0) {
        console.error('AmenityCategory received invalid category prop:', category);
        return null;
    }

    const displayCategoryName =
        category.charAt(0).toUpperCase() +
        category.slice(1).replace(/([A-Z])/g, ' $1');

    return (
        // Use standard class names
        <div className="amenity-category">
            <h3>{displayCategoryName}</h3>
            <div className="amenity-items">
                {amenities.map((amenity) => (
                    <AmenityItem
                        key={amenity}
                        category={category}
                        amenity={amenity}
                        checked={selectedAmenities.includes(amenity)}
                        // Pass the received function down AS the 'onChange' prop
                        onChange={handleAmenityChange}
                    />
                ))}
            </div>
        </div>
    );
}

// Ensure PropTypes match the received prop name
AmenityCategory.propTypes = {
    category: PropTypes.string.isRequired,
    amenities: PropTypes.arrayOf(PropTypes.string).isRequired,
    selectedAmenities: PropTypes.arrayOf(PropTypes.string).isRequired,
    handleAmenityChange: PropTypes.func.isRequired, // Correct prop type name
};

export default AmenityCategory;