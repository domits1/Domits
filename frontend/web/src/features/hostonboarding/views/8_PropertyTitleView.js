import { useParams } from "react-router-dom";
import TextAreaField from "../components/TextAreaField";
import { useAccommodationTitle } from "../hooks/usePropertyName";
import OnboardingButton from "../components/OnboardingButton";
import React from "react";
import OnboardingProgress from "../components/OnboardingProgress";
import { useDescription } from "../hooks/usePropertyDescription";
import { useOnboardingFlow } from "../hooks/useOnboardingFlow";

// Step 8
function PropertyTitleView() {
  const { type: accommodationType } = useParams();
  const { flowKey, prevPath, nextPath } = useOnboardingFlow();
  const { title, subtitle, handleInputChange } = useAccommodationTitle();
  const { description, updateDescription } = useDescription();
  const hasValue = (value) => String(value || "").trim().length > 0;
  const isTitleComplete =
    hasValue(title) &&
    hasValue(subtitle) &&
    (flowKey !== "accommodation" || hasValue(description));

  return (
    <div className="onboarding-host-div">
      <main className="container">
        <OnboardingProgress />
        <h2 className="onboardingSectionTitle">Name your accommodation</h2>
        <p className="onboardingSectionSubtitle">
          A short title works best. Don't worry, you can always change it later.
        </p>

          <TextAreaField
              label="Title"
              value={title}
              onChange={(value) => handleInputChange("title", value)}
              maxLength={128}
              placeholder="Enter your title here..."
              className="text-area-compact"
          />

          <h2 className="onboardingSectionTitle">Give it a suitable subtitle</h2>

          <TextAreaField
              label="Subtitle"
              value={subtitle}
              onChange={(value) => handleInputChange("subtitle", value)}
              maxLength={128}
              placeholder="Enter your subtitle here..."
              className="text-area-compact"
          />

          {flowKey === "accommodation" && (
            <TextAreaField
              label="Description"
              value={description}
              onChange={updateDescription}
              maxLength={500}
              placeholder="Enter your description here..."
              className="text-area-description"
            />
          )}

        <nav className="onboarding-button-box">
          <OnboardingButton
            routePath={prevPath || `/hostonboarding/${accommodationType}/photos`}
            btnText="Go back"
          />
          <OnboardingButton
            routePath={
              nextPath ||
              (flowKey === "accommodation"
                ? `/hostonboarding/${accommodationType}/pricing`
                : `/hostonboarding/${accommodationType}/description`)
            }
            btnText="Proceed"
            disabled={!isTitleComplete}
          />
        </nav>
      </main>
    </div>
  );
}

export default PropertyTitleView;
