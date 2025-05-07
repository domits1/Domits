// Filename: AmenitiesView.js
import React, { useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AmenityCategory from "../components/AmenityCategory"; // Uses refactored version below
import OnboardingButton from "../components/OnboardingButton";
// Use the constants file which exports 'amenities' object
import { amenities as amenitiesData } from "../constants/propertyAmenitiesData"; // Adjusted path/name assumption
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding";
import "../styles/onboardingHost.scss";
import { toast } from "react-toastify";

// Removed builder import

const AmenitiesView = () => {
  const navigate = useNavigate();
  const { type: accommodationType } = useParams();

  // --- Get state (object by category) and setter from Zustand ---
  const selectedAmenities = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.selectedAmenities || {} // Expecting {} from store
  );
  const setAmenities = useFormStoreHostOnboarding(
    (state) => state.setAmenities // Expecting the category setter
  );
  // -------------------------------------------------------------

  // --- Determine which amenities list to use based on type ---
  const typeAmenitiesSource = useMemo(() =>
      // Use the structure from input_file_4.js
      amenitiesData[`${accommodationType}Amenities`] || amenitiesData.allAmenities || {},
    [accommodationType]
  );
  // ---------------------------------------------------------

  // --- Handler to update Zustand store based on category ---
  // Receives category, amenity name (string), and the *new* checked state
  const handleAmenityChange = useCallback((category, amenityName, isChecked) => {
    const currentCategoryAmenities = selectedAmenities[category] || [];
    let updatedCategoryAmenities;
    if (isChecked) {
      // Add amenity name if checked and not already present
      if (!currentCategoryAmenities.includes(amenityName)) {
        updatedCategoryAmenities = [...currentCategoryAmenities, amenityName];
      } else {
        updatedCategoryAmenities = currentCategoryAmenities; // No change needed
      }
    } else {
      // Remove amenity name if unchecked
      updatedCategoryAmenities = currentCategoryAmenities.filter((item) => item !== amenityName);
    }
    // Update the store for this specific category
    setAmenities(category, updatedCategoryAmenities);
  }, [selectedAmenities, setAmenities]);
  // ----------------------------------------------------------

  // --- Proceed Logic ---
  const handleProceed = useCallback(() => {
    // Check based on the store object structure
    const noneSelected = Object.values(selectedAmenities || {}).every(list => list.length === 0);
    if (noneSelected) {
      toast.warn("Please select at least one amenity, or confirm none apply.");
      // return; // Uncomment if zero amenities is not allowed
    }
    // Just navigate - amenities object is already in the store
    console.log("Proceeding from AmenitiesView. Amenities in store:", selectedAmenities);
    navigate(`/hostonboarding/${accommodationType}/rules`);
  }, [selectedAmenities, navigate, accommodationType]);
  // ---------------------

  // --- Disabled State (based on store object) ---
  const isProceedDisabled = useMemo(() =>
      Object.values(selectedAmenities || {}).every(list => list.length === 0),
    [selectedAmenities]
  );
  // ---------------------------------------------

  return (
    <div className="onboarding-host-div">
      <div className="amenity-container page-body">
        <h2 className="onboardingSectionTitle">Select Amenities</h2>
        <p className="onboardingSectionSubtitle">Choose the amenities that your property offers.</p>
        <div className="amenity-groups">
          {/* Iterate through categories from the source data */}
          {Object.keys(typeAmenitiesSource).map((category) => (
            <AmenityCategory // Use refactored version below
              key={category}
              category={category}
              // Pass the array of amenity NAMES for this category
              amenities={typeAmenitiesSource[category]}
              // Pass the array of SELECTED NAMES for this category from the store
              selectedCategoryAmenities={selectedAmenities[category] || []}
              // Pass the handler that updates the store's object
              handleAmenityChange={handleAmenityChange}
            />
          ))}
        </div>
        <nav className="onboarding-button-box">
          <OnboardingButton
            routePath={`/hostonboarding/${accommodationType}/capacity`}
            btnText="Go back"
          />
          <OnboardingButton
            onClick={handleProceed} // Use extracted handler
            btnText="Proceed"
            disabled={isProceedDisabled}
          />
        </nav>
        {isProceedDisabled && (
          <p className="error-message" style={{marginTop: '10px'}}>Please select the amenities available.</p>
        )}
      </div>
    </div>
  );
};

export default AmenitiesView;