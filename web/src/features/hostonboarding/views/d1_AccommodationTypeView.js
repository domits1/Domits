import React from "react";
import AccommodationTypeSelector from "../../../../../../../../Desktop/hostonboarding copy/components/TypeSelector";
import { useHandleAccommodationTypeProceed } from "../../../../../../../../Desktop/hostonboarding copy/hooks/usePropertyType";
import { accommodationData } from "../../../../../../../../Desktop/hostonboarding copy/constants/propertyTypeData";
// Using the specific store import you preferred from the old code
import useFormStoreHostOnboarding from "../../../../../../../../Desktop/hostonboarding copy/stores/formStoreHostOnboarding";
// Using the specific component name import you preferred from the old code
import OnboardingButton from "../../../../../../../../Desktop/hostonboarding copy/components/OnboardingButton";
// CSS import (present in both versions)
import '../../../../../../../../Desktop/hostonboarding copy/styles/onboardingHost.css';

// Desc: Step 1 - Choose the type of accommodation you want to list on the platform
export default function AccommodationTypeView() {
  // Using the preferred store hook
  const selectedAccommodationType = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.type,
  );
  // Using the preferred store hook
  const setAccommodationType = useFormStoreHostOnboarding(
    (state) => state.setAccommodationType,
  );

  const { handleProceed } = useHandleAccommodationTypeProceed();

  // Disabled logic (present in both versions)
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
          {/* Using the preferred component name and variant (present in both) */}
          <OnboardingButton
            routePath="/hostdashboard"
            btnText="Go to dashboard"
            variant="secondary"
          />
          {/* Using the preferred component name and disabled logic (present in both) */}
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