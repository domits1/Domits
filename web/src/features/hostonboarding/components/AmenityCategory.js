// Filename: AmenityCategory.js
import React from 'react';
import AmenityItem from "./AmenityItem"; // Uses refactored version below

// Receives:
// - category: string (e.g., "Kitchen")
// - amenities: array of strings [name1, name2, ...] for this category
// - selectedCategoryAmenities: array of strings [name1, name3, ...] selected in this category
// - handleAmenityChange: function(category, amenityName, isChecked) from parent view
function AmenityCategory({ category, amenities, selectedCategoryAmenities, handleAmenityChange }) {

  // Create a Set of selected names in this category for efficient lookup
  const selectedNamesSet = new Set(selectedCategoryAmenities);

  return (
    <div>
      <h2 className="amenity-header">{category}</h2>
      <section className="check-box">
        {/* Map over the array of amenity NAMES */}
        {amenities.map((amenityName) => {
          const isChecked = selectedNamesSet.has(amenityName);
          return (
            <AmenityItem // Use refactored version below
              key={amenityName} // Use the name as key
              amenityName={amenityName} // Pass the name
              category={category} // Pass the category
              checked={isChecked} // Pass the calculated checked state
              // Pass the main handler directly
              // AmenityItem will call this with (category, amenityName, newCheckedState)
              onChange={handleAmenityChange}
            />
          );
        })}
      </section>
    </div>
  );
}

export default AmenityCategory;