import React from "react";
import AccommodationTypeSelector from "../components/TypeSelector";
import Button from "../components/OnboardingButton";
import { useHandleAccommodationTypeProceed } from "../hooks/usePropertyType";
import { accommodationData } from "../constants/propertyTypeData";
import useFormStore from "../stores/formStore";
import '../styles/onboardingHost.css';

export default function AccommodationTypeView() {
  const selectedAccommodationType = useFormStore(
      (state) => state.accommodationDetails.type
  );
  const setAccommodationType = useFormStore(
      (state) => state.setAccommodationType
  );

  const { handleProceed } = useHandleAccommodationTypeProceed();
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
            <Button routePath="/hostdashboard" btnText="Go to dashboard" variant="secondary" />
            <Button
                onClick={handleProceed}
                btnText="Proceed"
                disabled={isProceedDisabled}
            />
          </nav>
        </main>
      </div>
  );
}