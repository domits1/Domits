import React from "react";
import { useParams } from "react-router-dom";
import { useDescription } from "../hooks/usePropertyDescription";
import TextAreaField from "../components/TextAreaField";
import SpecificationForm from "../components/SpecificationForm";
import Button from "../components/OnboardingButton";
import "../styles/PropertyDescriptionView.css";

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

  const currentSpecifications = accommodationType === "boat"
      ? boatSpecifications
      : accommodationType === "camper"
          ? camperSpecifications
          : {}; // Use empty object instead of null for safer access

  const updateSpecification = accommodationType === "boat"
      ? updateBoatSpecification
      : accommodationType === "camper"
          ? updateCamperSpecification
          : () => { }; // No-op function for other types

  const MIN_DESCRIPTION_LENGTH = 50;
  const MAX_DESCRIPTION_LENGTH = 500;

  const requiredBoatFields = ["Manufacturer", "Model", "GPI"]; // Example required fields
  const requiredCamperFields = ["LicensePlate", "CamperBrand", "Model", "GPI"]; // Example required fields

  const getRequiredFields = (type) => {
    if (type === 'boat') return requiredBoatFields;
    if (type === 'camper') return requiredCamperFields;
    return [];
  };

  const requiredFields = getRequiredFields(accommodationType);

  // Check if any required spec field is missing or empty
  const requiredSpecsMissing = requiredFields.some(field => {
    const value = currentSpecifications[field];
    return value === null || value === undefined || String(value).trim() === '';
  });

  // Determine if the proceed button should be disabled
  const isProceedDisabled =
      !description.trim() ||
      description.length < MIN_DESCRIPTION_LENGTH ||
      // Only check specs if they are relevant for the type
      ((accommodationType === "boat" || accommodationType === "camper") && requiredSpecsMissing);


  return (
      <div className="onboarding-host-div">
        <main className="description-view-container container page-body">
          <h2 className="onboardingSectionTitle">Provide a description</h2>
          <p className="onboardingSectionSubtitle">
            Share what makes your accommodation special.
          </p>
          <TextAreaField
              label="Description" // Added label back
              value={description}
              onChange={updateDescription}
              maxLength={MAX_DESCRIPTION_LENGTH}
              placeholder="Enter your description here..."
              required
              showCounter={true}
              hintText={`Minimum ${MIN_DESCRIPTION_LENGTH} characters.`}
              className="description-textarea-wrapper"
          />

          {(accommodationType === "boat" || accommodationType === "camper") && (
              <SpecificationForm
                  type={accommodationType}
                  specifications={currentSpecifications}
                  updateSpecification={updateSpecification}
                  requiredFields={requiredFields} // Pass required fields to the form if needed for UI hints
              />
          )}

          <nav className="onboarding-button-box">
            <Button
                routePath={`/hostonboarding/${accommodationType}/address`}
                btnText="Go back"
                variant="secondary"
            />
            <Button
                routePath={`/hostonboarding/${accommodationType}/capacity`}
                btnText="Proceed"
                disabled={isProceedDisabled}
            />
          </nav>
          {isProceedDisabled && description.length > 0 && description.length < MIN_DESCRIPTION_LENGTH && (
              <p className="error-message">Description must be at least {MIN_DESCRIPTION_LENGTH} characters.</p>
          )}
          {isProceedDisabled && (accommodationType === "boat" || accommodationType === "camper") && requiredSpecsMissing && (
              <p className="error-message">Please fill in all required specifications.</p>
          )}
        </main>
      </div>
  );
}

export default PropertyDescriptionView;