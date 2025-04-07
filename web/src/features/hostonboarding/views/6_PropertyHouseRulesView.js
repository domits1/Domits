import { useParams } from "react-router-dom";
import HouseRuleCheckbox from "../components/HouseRuleCheckbox";
import TimeSelector from "../components/TimeSelector";
import { useHouseRules } from "../hooks/usePropertyHouseRules";
import OnboardingButton from "../components/OnboardingButton";

// Step 6
function PropertyHouseRulesView() {
  const { type: accommodationType } = useParams();
  const { houseRules, handleCheckboxChange, handleTimeChange } =
    useHouseRules();

  return (
    <main className="page-body">
      <h2 className="onboardingSectionTitle">House rules</h2>
      <div className="houseRulesContainer">
        <div className="toggle-container">
          <HouseRuleCheckbox
            label="Allow smoking"
            value={houseRules.AllowSmoking}
            onChange={(e) =>
              handleCheckboxChange("AllowSmoking", e.target.checked)
            }
          />
          <HouseRuleCheckbox
            label="Allow pets"
            value={houseRules.AllowPets}
            onChange={(e) =>
              handleCheckboxChange("AllowPets", e.target.checked)
            }
          />
          <HouseRuleCheckbox
            label="Allow parties/events"
            value={houseRules.AllowParties}
            onChange={(e) =>
              handleCheckboxChange("AllowParties", e.target.checked)
            }
          />
        </div>
        <hr />
        <TimeSelector
          label="Check-in"
          time={houseRules.CheckIn}
          onChange={(subKey, value) =>
            handleTimeChange("CheckIn", subKey, value)
          }
        />
        <TimeSelector
          label="Check-out"
          time={houseRules.CheckOut}
          onChange={(subKey, value) =>
            handleTimeChange("CheckOut", subKey, value)
          }
        />
      </div>
      <nav className="onboarding-button-box">
        <OnboardingButton
          routePath={`/hostonboarding/${accommodationType}/amenities`}
          btnText="Go back"
        />
        <OnboardingButton
          routePath={`/hostonboarding/${accommodationType}/photos`}
          btnText="Proceed"
        />
      </nav>
    </main>
  );
}

export default PropertyHouseRulesView;
