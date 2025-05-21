// Desc: dependend step 2 - Choose the type of boat you want to list on the platform

import BoatTypeSelector from "../components/TypeSelector"
import { boatData } from "../constants/boatData"
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding"
import OnboardingButton from "../components/OnboardingButton"
import { useBuilder } from "../../../context/propertyBuilderContext";

function BoatTypeView() {
  const builder = useBuilder();
  const setBoatType = useFormStoreHostOnboarding((state) => state.setBoatType)
  const selectedBoatType = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.boatType,
  )
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
            class="OnboardingNextButton"
            routePath="/hostonboarding"
            btnText="Back"
          />
          <OnboardingButton
            onClick={ () => {
              builder.addPropertyType({type: "Boat", spaceType: selectedBoatType});
              console.log(builder);
            }}
            routePath="/hostonboarding/boat/address"
            btnText="Proceed"
          />
        </nav>
      </main>
    </div>
  );
}

export default BoatTypeView
