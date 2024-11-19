import BoatTypeSelector from "../components/TypeSelector";
import { boatData } from "../constants/boatData";
import useFormStore from "../stores/formStore";
import Button from "../components/button";

function BoatTypeView() {
  const setBoatType = useFormStore((state) => state.setBoatType);
  const selectedBoatType = useFormStore(
    (state) => state.accommodationDetails.boatType
  );
  return (
    <main className="page-body">
      <h2 className="onboardingSectionTitle">What type of boat do you own?</h2>
      <BoatTypeSelector
        options={boatData.boat.types}
        icons={boatData.boat.icons}
        selectedType={selectedBoatType}
        onSelectType={setBoatType}
      />
      <nav className="onboarding-button-box">
        <Button routePath="/hostonboarding" btnText="Back" />
        <Button routePath="/hostonboarding/boat/address" btnText="Proceed" />
      </nav>
    </main>
  );
}

export default BoatTypeView;
