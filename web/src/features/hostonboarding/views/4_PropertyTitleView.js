// Filename: PropertyTitleView.js
import React, { useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TextAreaField from "../components/TextAreaField";
import { useAccommodationTitle } from "../hooks/usePropertyName"; // Hook updates store
import OnboardingButton from "../components/OnboardingButton";
import "../styles/views/_propertyTitleView.scss";
// No builder needed here

function PropertyTitleView() {
  const navigate = useNavigate();
  const { type: accommodationType } = useParams();

  // Hook manages title state in Zustand store
  const { title, subtitle, handleInputChange } = useAccommodationTitle();



  // Disabled logic remains the same
  const isProceedDisabled = useMemo(() => {
    return !title || title.trim() === '';
  }, [title]);

  // Define handleProceed outside JSX
  const handleProceed = useCallback(() => {
    if (isProceedDisabled) return;

    // No builder interaction needed here - title is already in the store.
    console.log("Proceeding from title view. Title in state:", title);
    navigate(`/hostonboarding/${accommodationType}/description`);

  }, [navigate, accommodationType, title, isProceedDisabled]); // Dependencies

  // --- JSX (remains the same) ---
  return (
    <div className="onboarding-host-div">
      <main className="container page-body">
        <h2 className="onboardingSectionTitle">Name your accommodation</h2>
        <p className="onboardingSectionSubtitle">
          A short title works best. Don't worry, you can always change it later.
        </p>

        <div className={"textarea-container"}>
          <TextAreaField
            className="textarea-field"
            value={title} // From store via hook
            onChange={(value) => handleInputChange("title", value)} // Hook updates store
            maxLength={128}
            placeholder="Enter your title here..."
            required
            showCounter={true}
          />
        </div>

        <div className={"textarea-container"}>
          <TextAreaField
            className="textarea-field"
            value={subtitle} // From store via hook
            onChange={(value) => handleInputChange("subtitle", value)} // Hook updates store
            maxLength={128}
            placeholder="Enter your subtitle here..."
            required
            showCounter={true}
          />
        </div>

        <nav className="onboarding-button-box">
          <OnboardingButton
            routePath={`/hostonboarding/${accommodationType}/address`}
            btnText="Go back"
          />
          <OnboardingButton
            onClick={handleProceed} // Calls navigation handler
            btnText="Proceed"
            disabled={isProceedDisabled}
          />
        </nav>
      </main>
    </div>
  );
}

export default PropertyTitleView;