import React from "react";
import { useParams } from "react-router-dom";
import { useDescription } from "../hooks/useDescription";
import TextAreaField from "../components/TextAreaField";
import SpecificationForm from "../components/SpecificationForm";
import Button from "../components/button";

function DescriptionView() {
  const { type: accommodationType } = useParams();
  const {
    description,
    boatSpecifications,
    camperSpecifications,
    updateDescription,
    updateBoatSpecification,
    updateCamperSpecification,
  } = useDescription();

  const specifications =
    accommodationType === "boat"
      ? boatSpecifications
      : accommodationType === "camper"
      ? camperSpecifications
      : null;
  const updateSpecification =
    accommodationType === "boat"
      ? updateBoatSpecification
      : accommodationType === "camper"
      ? updateCamperSpecification
      : null;

  return (
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
        type={accommodationType}
        specifications={specifications}
        updateSpecification={updateSpecification}
      />
      <nav className="onboarding-button-box">
        <Button
          routePath={`/hostonboarding/${accommodationType}/title`}
          btnText="Go back"
        />
        <Button
          routePath={`/hostonboarding/${accommodationType}/pricing`}
          btnText="Proceed"
        />
      </nav>
    </main>
  );
}

export default DescriptionView;