
import AccommodationTypeSelector from "../components/TypeSelector";
import { useHandleAccommodationTypeProceed } from "../hooks/usePropertyType";
import { accommodationData } from "../constants/propertyTypeData";
import useFormStore from "../stores/formStore";
import OnboardingButton from "../components/OnboardingButton";
import {submitAccommodation} from "../services/SubmitAccommodation";
import React from "react";

// Desc: Step 1 - Choose the type of accommodation you want to list on the platform
export default function AccommodationTypeView() {
  const selectedAccommodationType = useFormStore(
    (state) => state.accommodationDetails.type
  );
  const setAccommodationType = useFormStore(
    (state) => state.setAccommodationType
  );

  const { handleProceed } = useHandleAccommodationTypeProceed();

  return (
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
          <OnboardingButton routePath="/hostdashboard" btnText="Go to dashboard"/>
          <OnboardingButton onClick={handleProceed} btnText="Proceed"/>
      </nav>
  </main>
  );
}
