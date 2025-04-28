// --- START OF FILE 7_AmenitiesView.js ---

import { amenities } from "../constants/propertyAmenitiesData";
import AmenityCategory from "../components/AmenityCategory"; // Ensure this path is correct
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding";
import { useParams } from "react-router-dom";
import OnboardingButton from "../components/OnboardingButton"; // Ensure path is correct
import React from "react";
import "../styles/onboardingHost.scss"; // Main SCSS import

function AmenitiesView() {
  const { type: accommodationType } = useParams();

  const selectedAmenities = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.selectedAmenities,
  );
  const setAmenities = useFormStoreHostOnboarding((state) => state.setAmenities);

  const handleAmenityChange = (category, amenity, isChecked) => {
    const currentCategoryAmenities = selectedAmenities?.[category] || [];
    const updatedAmenities = isChecked
      ? [...currentCategoryAmenities, amenity]
      : currentCategoryAmenities.filter((item) => item !== amenity);
    setAmenities(category, updatedAmenities);
  };

  const typeAmenities =
    amenities[`${accommodationType}Amenities`] || amenities.allAmenities || {};

  const isProceedDisabled = Object.values(selectedAmenities || {}).every(
    (list) => list.length === 0
  );

  return (
    <div className="onboarding-host-div">
      <main className="amenity-container">
        <h2 className="onboardingSectionTitle">Select Amenities</h2>
        <p className="onboardingSectionSubtitle">
          Choose the amenities that your property offers.
        </p>

        {/* This div is the grid container - NO INLINE STYLES HERE */}
        <div className="amenity-groups">
          {Object.keys(typeAmenities).length > 0 ? (
            Object.keys(typeAmenities).map((category) => (
              // Use the updated AmenityCategory component
              <AmenityCategory
                key={category}
                category={category}
                amenities={typeAmenities[category]} // Pass the list of amenity names
                selectedAmenities={selectedAmenities?.[category] || []} // Pass selected for *this* category
                handleAmenityChange={handleAmenityChange}
              />
            ))
          ) : (
            // Consider styling this paragraph if needed
            <p style={{ padding: '0 var(--spacing-lg)' }}>
              No amenities defined for this accommodation type.
            </p>
          )}
        </div>

        <nav className="onboarding-button-box">
          {/* Ensure OnboardingButton adds 'onboarding-button' and variant classes */}
          <OnboardingButton
            routePath={`/hostonboarding/${accommodationType}/capacity`}
            btnText="Go back"
            variant="secondary"
          />
          <OnboardingButton
            routePath={`/hostonboarding/${accommodationType}/rules`}
            btnText="Proceed"
            variant="primary" // Explicitly set primary variant
            disabled={isProceedDisabled}
          />
        </nav>
      </main>
    </div>
  );
}

export default AmenitiesView;

// --- END OF FILE 7_AmenitiesView.js ---