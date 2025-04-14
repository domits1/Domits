import CamperTypeSelector from "../components/TypeSelector";
import { camperData } from "../constants/camperData";
import useFormStore from "../stores/formStore";
import Button from "../components/OnboardingButton";
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