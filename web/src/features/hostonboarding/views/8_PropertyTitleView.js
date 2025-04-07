import { useParams } from "react-router-dom";
import TextAreaField from "../components/TextAreaField";
import { useAccommodationTitle } from "../hooks/usePropertyName";
import OnboardingButton from "../components/OnboardingButton";
import {submitAccommodation} from "../services/SubmitAccommodation";
import React from "react";

// Step 8
function PropertyTitleView() {
  const { type: accommodationType } = useParams();
  const { title, subtitle, handleInputChange } = useAccommodationTitle();

  return (
      <main className="container">
          {/*TODO: Remove button, meant for dev testing purposes only:*/}
          <button onClick={(event) => submitAccommodation(event)}>Submit</button>


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
          />

          <h2 className="onboardingSectionTitle">Give it a suitable subtitle</h2>

          <TextAreaField
              label="Subtitle"
              value={subtitle}
              onChange={(value) => handleInputChange("subtitle", value)}
              maxLength={128}
              placeholder="Enter your subtitle here..."
          />

          <nav className="onboarding-button-box">
              <OnboardingButton
                  routePath={`/hostonboarding/${accommodationType}/photos`}
                  btnText="Go back"
              />
              <OnboardingButton
                  routePath={`/hostonboarding/${accommodationType}/description`}
                  btnText="Proceed"
              />
          </nav>
      </main>
  );
}

export default PropertyTitleView;
