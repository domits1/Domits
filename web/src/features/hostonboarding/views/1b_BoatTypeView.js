import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import BoatTypeSelector from "../components/TypeSelector";
import { boatData } from "../constants/boatData";
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding";
import OnboardingButton from "../components/OnboardingButton";
import "../styles/onboardingHost.scss";

function BoatTypeView() {
  const navigate = useNavigate();

  const selectedBoatType = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.boatType,
  );
  const setBoatType = useFormStoreHostOnboarding((state) => state.setBoatType);

  const isProceedDisabled = !selectedBoatType;

  const handleProceed = useCallback(() => {
    if (isProceedDisabled) return;

    console.log("Proceeding from BoatTypeView. Boat type in store:", selectedBoatType);
    navigate("/hostonboarding/boat/address");

  }, [navigate, selectedBoatType, isProceedDisabled]);

  return (
    <div className="onboarding-host-div">
      <main className="page-body">
        <h2 className="onboardingSectionTitle">
          What type of boat do you own?
        </h2>
        <BoatTypeSelector
          options={boatData.boat.types}
          icons={boatData.boat.icons}
          selectedType={selectedBoatType}
          onSelectType={setBoatType}
        />
        <nav className="onboarding-button-box">
          <OnboardingButton
            routePath="/hostonboarding"
            btnText="Back"
          />
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

export default BoatTypeView;