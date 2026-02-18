import React, { useState } from "react";
import { useSummary } from "../hooks/useSummary";
import SummaryTable from "../components/SummaryTable";
import SpecificationsTable from "../components/SpecificationsTable";
import DeclarationSection from "../components/DeclarationSection";
import FetchUserId from "../utils/FetchUserId";
import { useNavigate } from "react-router-dom";
import { submitAccommodation } from "../services/SubmitAccommodation.js";
import { useBuilder } from "../../../context/propertyBuilderContext";
import OnboardingProgress from "../components/OnboardingProgress";
import { useOnboardingFlow } from "../hooks/useOnboardingFlow";
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding";
import { toast } from "react-toastify";

function SummaryViewAndSubmit() {
  const builder = useBuilder();
  const { prevPath } = useOnboardingFlow();
  const { data } = useSummary();
  const imageList = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.imageList
  );
  const [hasDeclaredLegitimacy, setHasDeclaredLegitimacy] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const canProceed = hasDeclaredLegitimacy && hasAcceptedTerms;
  const type = data.type;
  const navigate = useNavigate();

  const handleSubmit = () => {
    if (!hasDeclaredLegitimacy || !hasAcceptedTerms) {
      toast.error("Please accept all declarations and terms to continue.");
      return;
    }
    if (Array.isArray(imageList) && imageList.length < 5) {
      toast.error("Upload at least 5 photos to continue.");
      return;
    }
    submitAccommodation(navigate, builder);
  };

  return (
    <div className="onboarding-host-div">
      <div className="summary">
        <OnboardingProgress />
        <FetchUserId />
        <h2>Please check if everything is correct</h2>
        <SummaryTable data={data} type={type} />
        <SpecificationsTable data={data} type={type} />
        {/* <FeatureTable features={data.Features} /> */}
        <DeclarationSection
          hasDeclaredLegitimacy={hasDeclaredLegitimacy}
          onToggleDeclaredLegitimacy={() => setHasDeclaredLegitimacy((current) => !current)}
          hasAcceptedTerms={hasAcceptedTerms}
          onToggleAcceptedTerms={() => setHasAcceptedTerms((current) => !current)}
        />
        <div className="onboarding-button-box">
          <button
            className="onboarding-button"
            onClick={() => (prevPath ? navigate(prevPath) : navigate(-1))}
          >
            Go back to change
          </button>
          <button
            className="onboarding-button"
            onClick={handleSubmit}
            disabled={!canProceed}
          >
            Confirm and proceed
          </button>
        </div>
      </div>
    </div>
  );
}

export default SummaryViewAndSubmit;
