// Desc: Step 1 - Choose the type of accommodation you want to list on the platform

import AccommodationTypeSelector from "../components/TypeSelector";
import Button from "../components/button";
import { useHandleAccommodationTypeProceed } from "../hooks/usePropertyType";
import { accommodationData } from "../constants/propertyTypeData";
import useFormStore from "../stores/formStore";

function AccommodationTypeView() {
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
        <Button routePath="/hostdashboard" btnText="Go to dashboard" />
        <Button onClick={handleProceed} btnText="Proceed" />
      </nav>
    </main>
  );
}

export default AccommodationTypeView;