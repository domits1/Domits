// Filename: PropertyDescriptionView.js
import React, { useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding";
import TextAreaField from "../components/TextAreaField";
import SpecificationForm from "../components/SpecificationForm";
import OnboardingButton from "../components/OnboardingButton";
import "../styles/views/_propertyDescriptionView.scss";
import { toast } from "react-toastify"; // Keep for feedback

// Removed builder import

function PropertyDescriptionView() {
  const navigate = useNavigate();
  const { type: accommodationType } = useParams();

  // --- Fetch state directly from Zustand ---
  const description = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.description
  );
  const boatSpecifications = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.boatSpecifications
  );
  const camperSpecifications = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.camperSpecifications
  );
  // Common technical details are stored separately
  const technicalDetails = useFormStoreHostOnboarding(
    (state) => state.technicalDetails
  );
  // -----------------------------------------

  // --- Fetch setters directly from Zustand ---
  const updateDescription = useFormStoreHostOnboarding(
    (state) => state.updateDescription
  );
  const zustandUpdateBoatSpec = useFormStoreHostOnboarding(
    (state) => state.updateBoatSpecification
  );
  const zustandUpdateCamperSpec = useFormStoreHostOnboarding(
    (state) => state.updateCamperSpecification
  );
  const zustandUpdateTechDetails = useFormStoreHostOnboarding(
    (state) => state.updateTechnicalDetails
  );
  // ----------------------------------------

  // --- Constants and Validation Logic ---
  const MIN_DESCRIPTION_LENGTH = 50;
  const MAX_DESCRIPTION_LENGTH = 500;

  // Memoized callback to update the correct part of the Zustand store
  const updateSpecification = useCallback((key, value) => {
    // Prioritize common technical details based on the initial store structure
    if (key in technicalDetails) {
      zustandUpdateTechDetails(key, value);
    }
    // If not common, update type-specific specs
    else if (accommodationType === "boat") {
      zustandUpdateBoatSpec(key, value);
    } else if (accommodationType === "camper") {
      zustandUpdateCamperSpec(key, value);
    } else {
      console.warn(`Spec key "${key}" ignored for type "${accommodationType}".`);
    }
  }, [
    accommodationType,
    zustandUpdateBoatSpec,
    zustandUpdateCamperSpec,
    zustandUpdateTechDetails,
    technicalDetails // Depends on the keys of the initial technicalDetails state
  ]);

  // Memoized combined specifications object for passing to the form
  const currentSpecifications = useMemo(() => {
    return {
      ...technicalDetails, // Start with common details
      // Merge type-specific details (will overwrite common if keys clash, but shouldn't)
      ...(accommodationType === "boat" ? boatSpecifications : {}),
      ...(accommodationType === "camper" ? camperSpecifications : {}),
    };
  }, [accommodationType, boatSpecifications, camperSpecifications, technicalDetails]);

  // Memoized required specification keys based on type
  const requiredSpecKeys = useMemo(() => {
    if (accommodationType === "boat") return ["Manufacturer", "Model", "generalPeriodicInspection"];
    if (accommodationType === "camper") return ["LicensePlate", "CamperBrand", "Model", "generalPeriodicInspection"];
    // Assume GPI is the only common required field if specs are shown for other types
    return ["generalPeriodicInspection"];
  }, [accommodationType]);

  // Memoized check for missing required specifications
  const requiredSpecsMissing = useMemo(() => {
    if (accommodationType !== "boat" && accommodationType !== "camper") return false;
    return requiredSpecKeys.some(key => {
      const specValue = currentSpecifications[key]; // Check the combined object
      return specValue === null || specValue === undefined || String(specValue).trim() === '';
    });
  }, [currentSpecifications, requiredSpecKeys, accommodationType]);

  // Memoized check for description validity
  const isDescriptionValid = useMemo(() => (
    description && description.trim().length >= MIN_DESCRIPTION_LENGTH
  ), [description]);

  // Memoized check for proceeding ability
  const isProceedDisabled = useMemo(() => (
    !isDescriptionValid || requiredSpecsMissing
  ), [isDescriptionValid, requiredSpecsMissing]);
  // ---------------------------------------

  // --- Navigation Handler ---
  const handleProceed = useCallback(() => {
    if (isProceedDisabled) {
      // Optional: Show toast if proceed is clicked while disabled
      // toast.warn("Please complete the description and required specifications.");
      return;
    }
    // No builder interaction needed here. Data is in the store.
    console.log("Proceeding from description view. Data is stored in Zustand.");
    navigate(`/hostonboarding/${accommodationType}/capacity`);
  }, [
    accommodationType,
    navigate,
    isProceedDisabled
    // No dependency on builder or specific state data needed for navigation
  ]);
  // ------------------------

  // --- Render ---
  return (
    <div className="onboarding-host-div">
      <main className="container page-body">
        <h2 className="onboardingSectionTitle">Provide a description</h2>
        <p className="onboardingSectionSubtitle">
          Share what makes your accommodation special. (Min {MIN_DESCRIPTION_LENGTH} chars)
        </p>

        {/* Description */}
        <div className="textarea-container">
          <TextAreaField
            className="onboarding-textarea description-textarea"
            label="Description*"
            value={description} // Read from store
            onChange={updateDescription} // Update store
            maxLength={MAX_DESCRIPTION_LENGTH}
            placeholder="Share key features, highlights..."
            required
            showCounter={true}
          />
        </div>

        {/* Specifications (Conditional) */}
        {(accommodationType === "boat" || accommodationType === "camper") && (
          <div className="specification-form-container">
            <h3 className="specifications-heading">Specifications</h3>
            <SpecificationForm
              type={accommodationType}
              specifications={currentSpecifications} // Pass combined state
              updateSpecification={updateSpecification} // Pass store update handler
            />
          </div>
        )}

        {/* Validation Errors */}
        <div className="error-messages-container" style={{marginTop: '10px'}}>
          {!isDescriptionValid && description?.length > 0 && (
            <p className="error-message">Description must be at least {MIN_DESCRIPTION_LENGTH} characters.</p>
          )}
          {requiredSpecsMissing && (
            <p className="error-message">Please fill in all required specifications (*).</p>
          )}
        </div>

        {/* Navigation */}
        <nav className="onboarding-button-box">
          <OnboardingButton
            routePath={`/hostonboarding/${accommodationType}/title`}
            btnText="Go back"
          />
          <OnboardingButton
            onClick={handleProceed} // Navigate
            btnText="Proceed"
            disabled={isProceedDisabled}
          />
        </nav>
      </main>
    </div>
  );
}

export default PropertyDescriptionView;