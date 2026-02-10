import { useParams } from "react-router-dom";
import HouseRuleCheckbox from "../components/HouseRuleCheckbox";
import TimeSelector from "../components/TimeSelector";
import { useHouseRules } from "../hooks/usePropertyHouseRules";
import OnboardingButton from "../components/OnboardingButton";
import { useBuilder } from "../../../context/propertyBuilderContext";
import OnboardingProgress from "../components/OnboardingProgress";
import { useOnboardingFlow } from "../hooks/useOnboardingFlow";
import { toast } from "react-toastify";

// Step 6
function PropertyHouseRulesView() {
  const builder = useBuilder();
  const { prevPath, nextPath } = useOnboardingFlow();
  const { type: accommodationType } = useParams();
  const { houseRules, checkIn, handleCheckboxChange, handleTimeChange } = useHouseRules();

  function timeStringToNumber(timeString) {
    const [hourStr] = timeString.split(":");
    return parseInt(hourStr, 10);
  }

  const isValidCheckInGap = () => {
    const checkInStart = checkIn?.CheckIn?.from;
    const checkOutEnd = checkIn?.CheckOut?.till;
    if (!Number.isFinite(checkInStart) || !Number.isFinite(checkOutEnd)) return false;
    return checkInStart - checkOutEnd >= 1;
  };

  return (
    <div className="onboarding-host-div">
      <main className="page-body">
        <OnboardingProgress />
        <h2 className="onboardingSectionTitle">Set house rules</h2>
        <p className="onboardingSectionSubtitle">Select any rules that apply to your property.</p>
        <div className="houseRulesContainer">
          <div className="house-rules-times">
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
          <div className="house-rules-list">
            {[
              { key: "SmokingAllowed", label: "No smoking", invert: true },
              { key: "PetsAllowed", label: "No pets", invert: true },
              { key: "Parties/EventsAllowed", label: "No parties or events", invert: true },
              { key: "SuitableForChildren", label: "Suitable for children" },
              { key: "SuitableForInfants", label: "Suitable for infants" },
            ].map(({ key, label, invert }) => {
              const currentValue = Boolean(houseRules?.[key]);
              const checked = invert ? !currentValue : currentValue;
              return (
                <HouseRuleCheckbox
                  key={key}
                  label={label}
                  value={checked}
                  onChange={(e) => {
                    const nextValue = invert ? !e.target.checked : e.target.checked;
                    handleCheckboxChange(key, nextValue);
                  }}
                />
              );
            })}
          </div>
        </div>
        <p className="house-rules-note">You can change this later.</p>
        <nav className="onboarding-button-box">
          <OnboardingButton
            routePath={prevPath || `/hostonboarding/${accommodationType}/amenities`}
            btnText="Go back"
          />
          <OnboardingButton
            onClick={() => {
              if (!isValidCheckInGap()) {
                toast.error("Check-in must start at least 1 hour after check-out ends.");
                return false;
              }

              const allowedRules = ["SmokingAllowed", "PetsAllowed", "Parties/EventsAllowed"];
              const houseRulesArray = allowedRules.map((rule) => ({
                rule,
                value: Boolean(houseRules?.[rule]),
              }));
              builder.addRules(houseRulesArray);
              builder.addCheckIn({
                checkIn: { from: checkIn.CheckIn.from, till: checkIn.CheckIn.till },
                checkOut: { from: checkIn.CheckOut.from, till: checkIn.CheckOut.till },
              });
              console.log(builder);
              return true;
            }}
            routePath={nextPath || `/hostonboarding/${accommodationType}/photos`}
            btnText="Proceed"
          />
        </nav>
      </main>
    </div>
  );
}

export default PropertyHouseRulesView;
