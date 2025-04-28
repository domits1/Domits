import React from "react";
import AccommodationTypeSelector from "../components/TypeSelector";
import { useHandleAccommodationTypeProceed } from "../hooks/usePropertyType";
import { accommodationData } from "../constants/propertyTypeData";
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding";
import OnboardingButton from "../components/OnboardingButton";
import "../styles/onboardingHost.scss";

export default function AccommodationTypeView() {
  // Currently selected
  const selectedAccommodationType = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.type,
  );
  // Set the type
  const setAccommodationType = useFormStoreHostOnboarding(
    (state) => state.setAccommodationType,
  );

  const handleProceed = useHandleAccommodationTypeProceed();
  const isProceedDisabled = !selectedAccommodationType;

  return (
    <div className="onboarding-host-div">
      <main className="page-body">
        <h2 className="onboardingSectionTitle">
          What best describes your accommodation?
        </h2>
        <AccommodationTypeSelector
          options={accommodationData.accommodation.types}
          icons={accommodationData.accommodation.icons}
          selectedType={selectedAccommodationType}
          onSelectType={setAccommodationType}
        />
        <nav className="onboarding-button-box">
          <OnboardingButton
            routePath="/hostdashboard"
            btnText="Go to dashboard"
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