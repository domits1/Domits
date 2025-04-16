import { useParams } from "react-router-dom";
import HouseRuleCheckbox from "../components/HouseRuleCheckbox";
import TimeSelector from "../components/TimeSelector";
import { useHouseRules } from "../hooks/usePropertyHouseRules";
import OnboardingButton from "../components/OnboardingButton";
import { useBuilder } from "../../../context/propertyBuilderContext";
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding";

// Step 6
function PropertyHouseRulesView() {
  const builder = useBuilder();
  const { type: accommodationType } = useParams();
  const { houseRules, checkIn, handleCheckboxChange, handleTimeChange } = useHouseRules();

  function timeStringToNumber(timeString) {
    const [hourStr] = timeString.split(":");
    return parseInt(hourStr, 10);
  }

  return (
    <div className="onboarding-host-div">
      <main className="page-body">
        <h2 className="onboardingSectionTitle">House rules</h2>
        <div className="houseRulesContainer">
          <div className="toggle-container">
            <HouseRuleCheckbox
              label="Allow smoking"
              value={houseRules.AllowSmoking}
              onChange={(e) => handleCheckboxChange("AllowSmoking", e.target.checked)}
            />
            <HouseRuleCheckbox
              label="Allow pets"
              value={houseRules.AllowPets}
              onChange={(e) => handleCheckboxChange("AllowPets", e.target.checked)}
            />
            <HouseRuleCheckbox
              label="Allow parties/events"
              value={houseRules.AllowParties}
              onChange={(e) => handleCheckboxChange("AllowParties", e.target.checked)}
            />
          </div>
          <hr />
          <TimeSelector
            label="Check-in"
            time={checkIn.CheckIn}
            onChange={(subKey, value) => handleTimeChange("CheckIn", subKey, timeStringToNumber(value))}
          />
          <TimeSelector
            label="Check-out"
            time={checkIn.CheckOut}
            onChange={(subKey, value) => handleTimeChange("CheckOut", subKey, timeStringToNumber(value))}
          />
        </div>
        <nav className="onboarding-button-box">
          <OnboardingButton routePath={`/hostonboarding/${accommodationType}/amenities`} btnText="Go back" />
          <OnboardingButton
            onClick={() => {
              const houseRulesArray = Object.entries(houseRules).map(([rule, value]) => ({
                rule,
                value,
              }));
              builder.addRules(houseRulesArray);
              builder.addCheckIn({
                checkIn: { from: checkIn.CheckIn.from, till: checkIn.CheckIn.till },
                checkOut: { from: checkIn.CheckOut.from, till: checkIn.CheckOut.till },
              });
              console.log(builder);
            }}
            routePath={`/hostonboarding/${accommodationType}/photos`}
            btnText="Proceed"
          />
        </nav>
      </main>
    </div>
  );
}

export default PropertyHouseRulesView;
