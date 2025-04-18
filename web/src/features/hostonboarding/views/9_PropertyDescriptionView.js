import React from "react";
import { useParams } from "react-router-dom";
import { useDescription } from "../hooks/usePropertyDescription";
import TextAreaField from "../components/TextAreaField";
import SpecificationForm from "../components/SpecificationForm";
import OnboardingButton from "../components/OnboardingButton";
import { useBuilder } from "../../../context/propertyBuilderContext";
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding";

function PropertyDescriptionView() {
  const builder = useBuilder();
  const form = useFormStoreHostOnboarding();
  const technicalDetails = useFormStoreHostOnboarding((state) => state.technicalDetails);
  const type = builder.propertyType.property_type;
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

  return (
    <div className="onboarding-host-div">
      <main className="container">
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
            routePath={`/hostonboarding/${type}/title`}
            btnText="Go back"
          />
          <OnboardingButton
            onClick={()=> {
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
            routePath={`/hostonboarding/${type}/pricing`}
            btnText="Proceed"
          />
        </nav>
      </main>
    </div>
  );
}

export default PropertyDescriptionView;
