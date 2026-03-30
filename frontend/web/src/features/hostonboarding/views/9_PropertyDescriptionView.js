import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDescription } from "../hooks/usePropertyDescription";
import TextAreaField from "../components/TextAreaField";
import SpecificationForm from "../components/SpecificationForm";
import OnboardingButton from "../components/OnboardingButton";
import { useBuilder } from "../../../context/propertyBuilderContext";
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding";
import OnboardingProgress from "../components/OnboardingProgress";
import { useOnboardingFlow } from "../hooks/useOnboardingFlow";

function PropertyDescriptionView() {
  const builder = useBuilder();
  const navigate = useNavigate();
  const { flowKey, prevPath, nextPath } = useOnboardingFlow();
  const technicalDetails = useFormStoreHostOnboarding((state) => state.technicalDetails);
  const type = useFormStoreHostOnboarding((state) => state.accommodationDetails.type);
  
  const {
    description,
    boatSpecifications,
    camperSpecifications,
    updateDescription,
    updateBoatSpecification,
    updateCamperSpecification,
  } = useDescription();

  const specifications =
    type === "Boat"
      ? boatSpecifications
      : type === "Camper"
      ? camperSpecifications
      : null;
      
  const updateSpecification =
    type === "Boat"
      ? updateBoatSpecification
      : type === "Camper"
      ? updateCamperSpecification
      : null;

  useEffect(() => {
    if (flowKey === "accommodation") {
      navigate("/hostdashboard/hostonboarding/accommodation/pricing", { replace: true });
    }
  }, [flowKey, navigate]);

  return (
    <div className="onboarding-host-div">
      <main className="container">
        <OnboardingProgress />
        <h2 className="onboardingSectionTitle">Provide a description</h2>
        <p className="onboardingSectionSubtitle">
          Share what makes your accommodation special.
        </p>
        <TextAreaField
          label="Description"
          value={description}
          onChange={updateDescription}
          maxLength={500}
          placeholder="Enter your description here..."
        />
        <SpecificationForm
          type={type}
          specifications={specifications}
          updateSpecification={updateSpecification}
        />
        <nav className="onboarding-button-box">
          <OnboardingButton
            routePath={prevPath || `/hostdashboard/hostonboarding/${type}/title`}
            btnText="Go back"
          />
          <OnboardingButton
            onClick={() => {
              if (type === "Camper" || type === "Boat") {
                builder.addTechnicalDetails({
                  length: technicalDetails.length,
                  height: technicalDetails.height,
                  fuelConsumption: technicalDetails.fuelConsumption,
                  speed: technicalDetails.speed,
                  renovationYear: technicalDetails.renovationYear,
                  transmission: technicalDetails.transmission,
                  generalPeriodicInspection: technicalDetails.generalPeriodicInspection,
                  fourWheelDrive: technicalDetails.fourWheelDrive,
                })
              }
            }}
            routePath={nextPath || `/hostdashboard/hostonboarding/${type}/pricing`}
            btnText="Proceed"
          />
        </nav>
      </main>
    </div>
  );
}

export default PropertyDescriptionView;
