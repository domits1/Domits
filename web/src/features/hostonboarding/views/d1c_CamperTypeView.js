import CamperTypeSelector from "../../../../../../../../Desktop/hostonboarding copy/components/TypeSelector";
import { camperData } from "../../../../../../../../Desktop/hostonboarding copy/constants/camperData";
import useFormStore from "../../../../../../../../Desktop/hostonboarding copy/stores/formStore";
import Button from "../../../../../../../../Desktop/hostonboarding copy/components/OnboardingButton";
import React from "react";

function CamperTypeView() {
  const setCamperType = useFormStore((state) => state.setCamperType);
  const selectedCamperType = useFormStore(
      (state) => state.accommodationDetails.camperType,
  );
  const isProceedDisabled = !selectedCamperType;

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
            <Button routePath="/hostonboarding" btnText="Back" variant="secondary" />
            <Button
                routePath="/hostonboarding/camper/title"
                btnText="Proceed"
                disabled={isProceedDisabled}
            />
          </nav>
        </main>
      </div>
  );
}

export default CamperTypeView;