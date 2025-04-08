// Desc: dependend step 2 - Choose the type of camper you want to list on the platform

import CamperTypeSelector from "../components/TypeSelector"
import { camperData } from "../constants/camperData"
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding"
import OnboardingButton from "../components/OnboardingButton"

function CamperTypeView() {
  const setCamperType = useFormStoreHostOnboarding(
    (state) => state.setCamperType,
  )
  const selectedCamperType = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.camperType,
  )
  return (
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
        <OnboardingButton routePath="/hostonboarding" btnText="Back" />
        <OnboardingButton
          routePath="/hostonboarding/camper/address"
          btnText="Proceed"
        />
      </nav>
    </main>
  )
}

export default CamperTypeView
