import React, { useMemo, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding";
import TextAreaField from "../components/TextAreaField";
import SpecificationForm from "../components/SpecificationForm";
import OnboardingButton from "../components/OnboardingButton";
import "../styles/views/_propertyDescriptionView.scss";
import { useBuilder } from '../../../context/propertyBuilderContext'; // Adjust path if needed

function PropertyDescriptionView() {
  const builder = useBuilder();
  const navigate = useNavigate();

  const { type: accommodationType } = useParams();

  const description = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.description
  );
  const boatSpecifications = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.boatSpecifications
  );
  const camperSpecifications = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.camperSpecifications
  );
  const technicalDetails = useFormStoreHostOnboarding(
    (state) => state.technicalDetails
  );

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

  const MIN_DESCRIPTION_LENGTH = 50;
  const MAX_DESCRIPTION_LENGTH = 500;

  const currentSpecifications = useMemo(() => {
    const base = technicalDetails || {};
    if (accommodationType === "boat") {
      return { ...base, ...(boatSpecifications || {}) };
    }
    if (accommodationType === "camper") {
      return { ...base, ...(camperSpecifications || {}) };
    }
    return {};
  }, [accommodationType, technicalDetails, boatSpecifications, camperSpecifications]);

  const updateSpecification = useCallback((key, value) => {
      const techKeys = [
        'generalPeriodicInspection', 'speed', 'length', 'height',
        'fuelConsumption', 'renovationYear', 'transmission', 'fourWheelDrive'
      ];

      if (techKeys.includes(key)) {
        zustandUpdateTechDetails(key, value);
      } else if (accommodationType === 'boat') {
        zustandUpdateBoatSpec(key, value);
      } else if (accommodationType === 'camper') {
        zustandUpdateCamperSpec(key, value);
      }
    }, [accommodationType, zustandUpdateBoatSpec, zustandUpdateCamperSpec, zustandUpdateTechDetails]
  );

  const requiredSpecKeys = useMemo(() => {
    if (accommodationType === 'boat') return ["Manufacturer", "Model", "generalPeriodicInspection"];
    if (accommodationType === 'camper') return ["LicensePlate", "CamperBrand", "Model", "generalPeriodicInspection"];
    return [];
  }, [accommodationType]);

  const requiredSpecsMissing = useMemo(() => {
    if (accommodationType !== "boat" && accommodationType !== "camper") {
      return false;
    }
    return requiredSpecKeys.some(key => {
      const value = currentSpecifications[key];
      return value === null || value === undefined || String(value).trim() === '';
    });
  }, [currentSpecifications, requiredSpecKeys, accommodationType]);

  const isDescriptionTooShort = useMemo(() => (
    !description || description.trim().length < MIN_DESCRIPTION_LENGTH
  ), [description, MIN_DESCRIPTION_LENGTH]);

  const isProceedDisabled = useMemo(() => (
    isDescriptionTooShort || requiredSpecsMissing
  ), [isDescriptionTooShort, requiredSpecsMissing]);

  const handleProceed = useCallback(() => {
    if (isProceedDisabled) {
      return;
    }

    builder.addTechnicalDetails(technicalDetails || {});

    builder.addProperty({ description: description });

    console.log("Builder after adding tech details & description:", builder); // Optional: update log message
    navigate(`/hostonboarding/${accommodationType}/capacity`);

  }, [builder, technicalDetails, description, accommodationType, navigate, isProceedDisabled]);


  return (
    <div className="onboarding-host-div">
      <main className="container page-body">
        <h2 className="onboardingSectionTitle">Provide a description</h2>
        <p className="onboardingSectionSubtitle">
          Share what makes your accommodation special.
        </p>

        <div className="textarea-container">
          <TextAreaField
            className="onboarding-textarea description-textarea"
            label="Description*"
            value={description}
            onChange={updateDescription}
            maxLength={MAX_DESCRIPTION_LENGTH}
            placeholder="Share key features, highlights, and what makes your place unique..."
            required
            showCounter={true}
            hintText={`Minimum ${MIN_DESCRIPTION_LENGTH} characters. Describe the ambiance, amenities, and surroundings.`}
          />
        </div>

        {(accommodationType === "boat" || accommodationType === "camper") && (
          <div className="specification-form-container">
            <SpecificationForm
              type={accommodationType}
              specifications={currentSpecifications}
              updateSpecification={updateSpecification}
            />
          </div>
        )}

        <div className="error-messages-container">
          {isDescriptionTooShort && (
            <p className="error-message">Description must be at least {MIN_DESCRIPTION_LENGTH} characters.</p>
          )}
          {requiredSpecsMissing && (
            <p className="error-message">Please fill in all required specifications (*).</p>
          )}
        </div>

        <nav className="onboarding-button-box">
          <OnboardingButton
            routePath={`/hostonboarding/${accommodationType}/title`}
            btnText="Go back"
            variant="secondary"
          />
          <OnboardingButton
            onClick={handleProceed}
            btnText="Proceed"
            disabled={isProceedDisabled}
          />
        </nav>
      </main>
    </div>
  );
}

export default PropertyDescriptionView;