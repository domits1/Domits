import TextAreaField from "../components/TextAreaField";
import { useAccommodationTitle } from "../hooks/usePropertyName";
import OnboardingButton from "../components/OnboardingButton";
import React, { useMemo } from "react";
import "../styles/views/_propertyTitleView.scss";
import { useParams, useNavigate } from "react-router-dom";
import { useBuilder } from '../../../context/propertyBuilderContext';


function PropertyTitleView() {
  const builder = useBuilder();
  const navigate = useNavigate();

  const { type: accommodationType } = useParams();
  const { title, subtitle, handleInputChange } = useAccommodationTitle();

  const isProceedDisabled = useMemo(() => {
    return !title || title.trim() === '';
  }, [title]);

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
            onClick={() => {
              builder.addProperty({ title: title, subtitle: subtitle }); // Correctly passes partial update
              console.log("Builder after adding title:", builder);
              navigate(`/hostonboarding/${accommodationType}/description`);
            }}
            btnText="Proceed"
            disabled={isProceedDisabled}
          />
        </nav>
      </main>
    </div>
  );
}

export default PropertyTitleView;
