import BoatTypeSelector from "../components/TypeSelector";
import { boatData } from "../constants/boatData";
import useFormStore from "../stores/formStore";
import Button from "../components/OnboardingButton";
import React from "react";

function BoatTypeView() {
  const setBoatType = useFormStore((state) => state.setBoatType);
  const selectedBoatType = useFormStore(
      (state) => state.accommodationDetails.boatType,
  );
  const isProceedDisabled = !selectedBoatType;

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
            <Button
                routePath="/hostonboarding"
                btnText="Back"
                variant="secondary"
            />
            <Button
                routePath="/hostonboarding/boat/title"
                btnText="Proceed"
                disabled={isProceedDisabled}
            />
          </nav>
        </main>
      </div>
  );
}

export default BoatTypeView;