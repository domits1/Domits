import React from "react";
import { useParams } from "react-router-dom";
import TextAreaField from "../components/TextAreaField";
import { useAccommodationTitle } from "../hooks/usePropertyName";
import Button from "../components/OnboardingButton";

function PropertyTitleView() {
  const { type: accommodationType } = useParams();
  const { title, subtitle, handleInputChange } = useAccommodationTitle();
  const isProceedDisabled = !title.trim() || !subtitle.trim();

  return (
      <div className="onboarding-host-div">
        <main className="container page-body">
          <h2 className="onboardingSectionTitle">Name your accommodation</h2>
          <p className="onboardingSectionSubtitle">
            A short title works best. Don't worry, you can always change it later.
          </p>

          <TextAreaField
              label="Title" // Added label back for clarity if needed
              value={title}
              onChange={(value) => handleInputChange("title", value)}
              maxLength={128}
              placeholder="Enter your title here..."
          />

          <h2 className="onboardingSectionTitle">Give it a suitable subtitle</h2>

          <TextAreaField
              label="Subtitle" // Added label back for clarity if needed
              value={subtitle}
              onChange={(value) => handleInputChange("subtitle", value)}
              maxLength={128}
              placeholder="Enter your subtitle here..."
          />

          <nav className="onboarding-button-box">
            <Button
                // Route back depends on whether type selection was separate
                // If AccommodationTypeView was step 1, go back there
                routePath={`/hostonboarding`} // Or potentially /hostonboarding/${type} if sub-types exist
                btnText="Go back"
                variant="secondary"
            />
            <Button
                routePath={`/hostonboarding/${accommodationType}/address`}
                btnText="Proceed"
                disabled={isProceedDisabled}
            />
          </nav>
        </main>
      </div>
  );
}

export default PropertyTitleView;