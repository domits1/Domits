// --- START OF FILE 5_PropertyDescriptionView.js ---

import React, { useMemo } from "react"; // Import useMemo
import { useParams } from "react-router-dom";
import { useDescription } from "../hooks/usePropertyDescription";
import TextAreaField from "../components/TextAreaField";
import SpecificationForm from "../components/SpecificationForm";
import OnboardingButton from "../components/OnboardingButton";
import "../styles/onboardingHost.scss"; // Single shared SCSS file

function PropertyDescriptionView() {
  const { type: accommodationType } = useParams();
  const {
    description,
    boatSpecifications,
    camperSpecifications,
    updateDescription,
    updateBoatSpecification,
    updateCamperSpecification,
  } = useDescription();

  const currentSpecifications = useMemo(() => ( // Memoize specifications object
    accommodationType === "boat"
      ? boatSpecifications
      : accommodationType === "camper"
        ? camperSpecifications
        : {}
  ), [accommodationType, boatSpecifications, camperSpecifications]);

  const updateSpecification = useMemo(() => ( // Memoize update function
    accommodationType === "boat"
      ? updateBoatSpecification
      : accommodationType === "camper"
        ? updateCamperSpecification
        : () => {}
  ), [accommodationType, updateBoatSpecification, updateCamperSpecification]);

  const MIN_DESCRIPTION_LENGTH = 50;
  const MAX_DESCRIPTION_LENGTH = 500;

  // Define required fields within the component or import from constants
  const requiredFields = useMemo(() => {
    if (accommodationType === 'boat') return ["Manufacturer", "Model", "GPI"];
    if (accommodationType === 'camper') return ["LicensePlate", "CamperBrand", "Model", "GPI"];
    return [];
  }, [accommodationType]);

  const requiredSpecsMissing = useMemo(() => {
    // Only check if specs are relevant for the type
    if (accommodationType !== "boat" && accommodationType !== "camper") {
      return false;
    }
    return requiredFields.some(field => {
      const value = currentSpecifications[field];
      return value === null || value === undefined || String(value).trim() === '';
    });
  }, [currentSpecifications, requiredFields, accommodationType]);


  const isProceedDisabled = useMemo(() => (
    !description || // Check if description exists first
    description.trim().length < MIN_DESCRIPTION_LENGTH ||
    requiredSpecsMissing
  ), [description, requiredSpecsMissing, MIN_DESCRIPTION_LENGTH]);


  return (
    <div className="onboarding-host-div">
      {/* Use consistent classes for the main card */}
      <main className="container page-body">
        <h2 className="onboardingSectionTitle">Provide a description</h2>
        <p className="onboardingSectionSubtitle">
          Share what makes your accommodation special.
        </p>

        {/* Consistent wrapper class */}
        <div className="textarea-container">
          <TextAreaField
            // Use a consistent className prop for the component itself
            className="onboarding-textarea description-textarea" // Keep description-specific class if needed for overrides
            label="Description"
            value={description}
            onChange={updateDescription}
            maxLength={MAX_DESCRIPTION_LENGTH}
            placeholder="Enter your description here..."
            required
            showCounter={true}
            hintText={`Minimum ${MIN_DESCRIPTION_LENGTH} characters.`}
          />
        </div>

        {/* Specific elements for this view */}
        {(accommodationType === "boat" || accommodationType === "camper") && (
          // Add a wrapper class if needed for styling the form area
          <div className="specification-form-container">
            <SpecificationForm
              type={accommodationType}
              specifications={currentSpecifications}
              updateSpecification={updateSpecification}
              requiredFields={requiredFields}
            />
          </div>
        )}

        {/* Button box remains the same */}
        <nav className="onboarding-button-box">
          <OnboardingButton
            // Go back to previous step (Title)
            routePath={`/hostonboarding/${accommodationType}/title`}
            btnText="Go back"
            variant="secondary"
          />
          <OnboardingButton
            routePath={`/hostonboarding/${accommodationType}/capacity`} // Go forward to next step
            btnText="Proceed"
            disabled={isProceedDisabled}
          />
        </nav>

        {/* Error messages section */}
        <div className="error-messages-container">
          {isProceedDisabled && description && description.trim().length < MIN_DESCRIPTION_LENGTH && (
            <p className="error-message">Description must be at least {MIN_DESCRIPTION_LENGTH} characters.</p>
          )}
          {isProceedDisabled && requiredSpecsMissing && (
            <p className="error-message">Please fill in all required specifications.</p>
          )}
        </div>
      </main>
    </div>
  );
}

export default PropertyDescriptionView;