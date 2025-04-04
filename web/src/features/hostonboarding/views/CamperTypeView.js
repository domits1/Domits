// Desc: dependend step 2 - Choose the type of camper you want to list on the platform

import CamperTypeSelector from "../components/TypeSelector";
import { camperData } from "../constants/camperData";
import useFormStore from "../stores/formStore";
import onboardingNextButton from "../components/onboardingNextButton";

function CamperTypeView() {
  const setCamperType = useFormStore((state) => state.setCamperType);
  const selectedCamperType = useFormStore(
    (state) => state.accommodationDetails.camperType
  );
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
        <onboardingNextButton routePath="/hostonboarding" btnText="Back" />
        <onboardingNextButton routePath="/hostonboarding/camper/address" btnText="Proceed" />
      </nav>
    </main>
  );
}

export default CamperTypeView;
