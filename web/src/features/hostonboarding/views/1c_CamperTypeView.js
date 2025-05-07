// Filename: CamperTypeView.js
import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import CamperTypeSelector from "../components/TypeSelector";
import { camperData } from "../constants/camperData";
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding";
import OnboardingButton from "../components/OnboardingButton";
import "../styles/onboardingHost.scss";

function CamperTypeView() {
  const navigate = useNavigate();

  const selectedCamperType = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.camperType,
  );
  const setCamperType = useFormStoreHostOnboarding(
    (state) => state.setCamperType,
  );

  const isProceedDisabled = !selectedCamperType;

  // Define handleProceed outside JSX
  const handleProceed = useCallback(() => {
    if (isProceedDisabled) return;

    console.log("Proceeding from CamperTypeView. Camper type in store:", selectedCamperType);
    navigate("/hostonboarding/camper/address");

  }, [navigate, selectedCamperType, isProceedDisabled]);

  return (
    <div className="onboarding-host-div">
      <main className="page-body">
        <h2 className="onboardingSectionTitle">
          What type of camper do you own?
        </h2>
        <CamperTypeSelector
          options={camperData.camper.types}
          icons={camperData.camper.icons}
          selectedType={selectedCamperType}
          onSelectType={setCamperType}
        />
        <nav className="onboarding-button-box">
          <OnboardingButton routePath="/hostonboarding" btnText="Back" />
          <OnboardingButton
            onClick={handleProceed}
            btnText="Proceed"
            disabled={isProceedDisabled}
          />
        </nav>
      </main>
    </div>
  );
}

export default CamperTypeView;