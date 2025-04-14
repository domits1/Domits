import React from "react";
import { amenities } from "../constants/propertyAmenitiesData";
import AmenityCategory from "../components/AmenityCategory"; // Assuming this component handles rendering items
import useFormStore from "../stores/formStore";
import { useParams } from "react-router-dom";
import Button from "../components/OnboardingButton";
import "../styles/AmenityStyles.scss"; // Keep SCSS import

function AmenitiesView() {
  const { type: accommodationType } = useParams();

  // Get selected amenities state from the store
  const selectedAmenities = useFormStore(
      (state) => state.accommodationDetails.selectedAmenities,
  );
  // Get the function to update amenities in the store
  const setAmenities = useFormStore((state) => state.setAmenities);

  // Handler for when a checkbox state changes
  const handleAmenityChange = (category, amenity, isChecked) => {
    // Get the current list of selected amenities for the specific category, or an empty array if none
    const currentCategoryAmenities = selectedAmenities[category] || [];

    // Create the updated list: add if checked, remove if unchecked
    const updatedAmenities = isChecked
        ? [...currentCategoryAmenities, amenity] // Add new amenity
        : currentCategoryAmenities.filter((item) => item !== amenity); // Remove amenity

    // Update the state in the Zustand store
    setAmenities(category, updatedAmenities);
  };

  // Determine which set of amenities to display based on accommodation type
  // Fallback to 'allAmenities' if a specific type isn't found
  const typeAmenities =
      amenities[`${accommodationType}Amenities`] || amenities.allAmenities;

  // Calculate if the "Proceed" button should be disabled (no amenities selected)
  const isProceedDisabled = Object.values(selectedAmenities).every(
      (list) => list.length === 0
  );

  return (
      // Use a consistent outer div if needed for layout context (like flex centering)
      <div className="onboarding-host-div">
        {/* Main content area */}
        <main className="page-body">
          {/* Add the container for styling */}
          <div className="amenity-container">
            <h2 className="onboardingSectionTitle">Select Amenities</h2>
            <p className="onboardingSectionSubtitle">
              Choose the amenities your property offers. Select at least one to proceed.
            </p>

            {/* Grid container for amenity categories */}
            <div className="amenity-groups">
              {/* Map over each category in the relevant amenity data */}
              {Object.keys(typeAmenities).map((category) => (
                  <AmenityCategory
                      key={category}
                      category={category} // e.g., "General", "Kitchen"
                      amenities={typeAmenities[category]} // Array of amenity names for this category
                      // Pass the currently selected amenities FOR THIS CATEGORY
                      selectedAmenities={selectedAmenities[category] || []}
                      handleAmenityChange={handleAmenityChange} // Pass the handler down
                      // Pass isSelected prop calculation logic or let AmenityCategory handle it
                      // If AmenityCategory handles it, passing selectedAmenities is enough
                  />
              ))}
            </div>

            {/* Navigation buttons */}
            <nav className="onboarding-button-box">
              <Button
                  routePath={`/hostonboarding/${accommodationType}/capacity`}
                  btnText="Go back"
                  variant="secondary" // Assuming Button component uses this prop
              />
              <Button
                  routePath={`/hostonboarding/${accommodationType}/rules`}
                  btnText="Proceed"
                  disabled={isProceedDisabled} // Disable button if no amenities are selected
              />
            </nav>
          </div>
        </main>
      </div>
  );
}

export default AmenitiesView;

// --- Assumed structure for AmenityCategory.js ---
// It needs to render the .amenity-category, h3, .amenity-items,
// and loop through amenities to render .amenity-item divs.
// Crucially, it needs to add the 'selected' class conditionally.

/*
// Example structure inside AmenityCategory.js render/return:

function AmenityCategory({ category, amenities, selectedAmenities, handleAmenityChange }) {
  // Capitalize category name for display
  const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);

  return (
    <div className="amenity-category">
      <h3>{categoryTitle}</h3>
      <div className="amenity-items">
        {amenities.map((amenity) => {
          const isSelected = selectedAmenities.includes(amenity);
          const itemId = `${category}-${amenity.replace(/\s+/g, '-')}`; // Create unique ID

          return (
            <div
              key={amenity}
              // Add 'selected' class if the amenity is in the selected list
              className={`amenity-item ${isSelected ? 'selected' : ''}`}
            >
              <input
                type="checkbox"
                id={itemId}
                checked={isSelected}
                onChange={(e) => handleAmenityChange(category, amenity, e.target.checked)}
              />
              <label htmlFor={itemId}>
                {amenity}
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
*/