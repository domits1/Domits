// Filename: HouseTypeView.js
import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import HouseTypeSelector from "../components/HouseTypeSelector";
import OnboardingButton from "../components/OnboardingButton";
import "../styles/TypeSelector.scss";
import "../styles/_base.scss";
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding";

export default function HouseTypeView() {
  const navigate = useNavigate();
  // Removed: const builder = useBuilder();

  // Read state and get setter from Zustand
  const selectedGuestAccessType = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.guestAccessType,
  );
  const setGuestAccessType = useFormStoreHostOnboarding(
    (state) => state.setGuestAccessType, // Ensure correct setter name
  );

  const isProceedDisabled = !selectedGuestAccessType;

  // Define handleProceed outside JSX
  const handleProceed = useCallback(() => {
    if (isProceedDisabled) return;

    console.log("Proceeding from HouseTypeView. Guest access type in store:", selectedGuestAccessType);
    navigate("/hostonboarding/accommodation/address");

  }, [navigate, selectedGuestAccessType, isProceedDisabled]);

  return (
    <div className="onboarding-host-div">
      <main className="container page-body">
        <section className="guest-access">
          <h2 className="onboardingSectionTitle">
            What kind of space do your guests have access to?
          </h2>
          <HouseTypeSelector
            header="Entire house"
            description="Guests have the entire space to themselves"
            onSelectType={setGuestAccessType}
            selectedType={selectedGuestAccessType}
          />
          <HouseTypeSelector
            header="Private room"
            description="Guests have their own private room for sleeping"
            onSelectType={setGuestAccessType}
            selectedType={selectedGuestAccessType}
          />
          <HouseTypeSelector
            header="Shared room"
            description="Guests sleep in a room or common area that they may share with you or others"
            onSelectType={setGuestAccessType}
            selectedType={selectedGuestAccessType}
          />
        </section>

        <nav className="onboarding-button-box">
          <OnboardingButton
            routePath="/hostonboarding"
            btnText="Go back"
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