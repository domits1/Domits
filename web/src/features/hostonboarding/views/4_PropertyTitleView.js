import { useParams } from "react-router-dom";
import TextAreaField from "../components/TextAreaField";
import { useAccommodationTitle } from "../hooks/usePropertyName";
import OnboardingButton from "../components/OnboardingButton";
import React, { useMemo } from "react";
import "../styles/onboardingHost.scss";
import { useBuilder } from "../../../context/propertyBuilderContext";

function PropertyTitleView() {
  const { type: accommodationType } = useParams();
  const { title, subtitle, handleInputChange } = useAccommodationTitle();

  const isProceedDisabled = useMemo(() => {
    // Example logic: disable if title is empty or only whitespace
    return !title || title.trim() === '';
    // Or if description is also required:
    // return !title || title.trim() === '' || !description || description.trim() === '';
  }, [title /*, description */]); // Add relevant dependencies

  return (
    <div className="onboarding-host-div">
      <main className="container">
        <h2 className="onboardingSectionTitle">Name your accommodation</h2>
        <p className="onboardingSectionSubtitle">
          A short title works best. Don't worry, you can always change it later.
        </p>

        <div className={ "textarea-container"}>
          <TextAreaField
            className="textarea-field"
              value={title}
              onChange={(value) => handleInputChange("title", value)}
              maxLength={128}
              placeholder="Enter your title here..."
          />
        </div>

        <nav className="onboarding-button-box">
          <OnboardingButton
            routePath={`/hostonboarding/${accommodationType}/address`}
            btnText="Go back"
          />
          <OnboardingButton
            routePath={`/hostonboarding/${accommodationType}/description`}
            btnText="Proceed"
            disabled={isProceedDisabled}
          />
        </nav>
      </main>
    </div>
  );
}

export default PropertyTitleView;
