import React, { useState, useEffect } from "react";
import HouseRuleCheckbox from "../components/HouseRuleCheckbox";
import TimeSelector from "../components/TimeSelector";
import { useHouseRules } from "../hooks/usePropertyHouseRules";
import OnboardingButton from "../components/OnboardingButton";
import "../styles/onboardingHost.scss";
import { useParams, useNavigate } from "react-router-dom";
import { useBuilder } from '../../../context/propertyBuilderContext';

const timeToMinutes = (timeString) => {
  if (!timeString || typeof timeString !== 'string' || !timeString.includes(':')) return null;
  // Ensure timeString format is HH:MM before splitting
  const parts = timeString.split(':');
  if (parts.length !== 2) return null;
  const [hours, minutes] = parts.map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

const defaultCheckIn = { from: "15:00", till: "22:00" };
const defaultCheckOut = { from: "08:00", till: "11:00" };

function PropertyHouseRulesView() {
  const builder = useBuilder();
  const navigate = useNavigate();

  const { type: accommodationType } = useParams();
  const { houseRules, checkInOutData, handleCheckboxChange, handleTimeChange } = useHouseRules();

  const [errors, setErrors] = useState({});

  useEffect(() => {
    const checkInData = checkInOutData?.CheckIn;
    const checkOutData = checkInOutData?.CheckOut;

    const checkInNeedsDefaults =
      !checkInData ||
      !checkInData.from || checkInData.from === "00:00" || checkInData.from === 0 ||
      !checkInData.till || checkInData.till === "00:00" || checkInData.till === 0;

    const checkOutNeedsDefaults =
      !checkOutData ||
      !checkOutData.from || checkOutData.from === "00:00" || checkOutData.from === 0 ||
      !checkOutData.till || checkOutData.till === "00:00" || checkOutData.till === 0;

    if (checkInNeedsDefaults && handleTimeChange) {
      handleTimeChange("CheckIn", "from", defaultCheckIn.from);
      handleTimeChange("CheckIn", "till", defaultCheckIn.till);
    }

    if (checkOutNeedsDefaults && handleTimeChange) {
      handleTimeChange("CheckOut", "from", defaultCheckOut.from);
      handleTimeChange("CheckOut", "till", defaultCheckOut.till);
    }
  }, [checkInOutData, handleTimeChange]);


  useEffect(() => {
    const newErrors = {};
    const checkInFromMinutes = timeToMinutes(checkInOutData?.CheckIn?.from);
    const checkInTilMinutes = timeToMinutes(checkInOutData?.CheckIn?.till);
    const checkOutFromMinutes = timeToMinutes(checkInOutData?.CheckOut?.from);
    const checkOutTilMinutes = timeToMinutes(checkInOutData?.CheckOut?.till);

    if (!checkInOutData?.CheckIn?.from || checkInOutData.CheckIn.from === "00:00" || checkInOutData.CheckIn.from === 0) {
      newErrors.checkIn = { field: 'from', message: 'Check-in "From" time is required.' };
    }
    else if (!checkInOutData?.CheckIn?.till || checkInOutData.CheckIn.till === "00:00" || checkInOutData.CheckIn.till === 0) {
      newErrors.checkIn = { field: 'till', message: 'Check-in "Till" time is required.' };
    }
    else if (checkInFromMinutes !== null && checkInTilMinutes !== null && checkInTilMinutes < checkInFromMinutes) {
      newErrors.checkIn = { field: 'till', message: 'Check-in "Till" time must be same as or later than "From" time.' };
    }


    if (!checkInOutData?.CheckOut?.from || checkInOutData.CheckOut.from === "00:00" || checkInOutData.CheckOut.from === 0) {
      newErrors.checkOut = { field: 'from', message: 'Check-out "From" time is required.' };
    }
    else if (!checkInOutData?.CheckOut?.till || checkInOutData.CheckOut.till === "00:00" || checkInOutData.CheckOut.till === 0) {
      newErrors.checkOut = { field: 'till', message: 'Check-out "Till" time is required.' };
    }
    else if (checkOutFromMinutes !== null && checkOutTilMinutes !== null && checkOutTilMinutes < checkOutFromMinutes) {
      if (!newErrors.checkOut) {
        newErrors.checkOut = { field: 'till', message: 'Check-out "Till" time must be same as or later than "From" time.' };
      }
    }


    setErrors(newErrors);

  }, [checkInOutData]);

  const isProceedDisabled =
    !checkInOutData?.CheckIn?.from || checkInOutData.CheckIn.from === "00:00" || checkInOutData.CheckIn.from === 0 ||
    !checkInOutData?.CheckIn?.till || checkInOutData.CheckIn.till === "00:00" || checkInOutData.CheckIn.till === 0 ||
    !checkInOutData?.CheckOut?.from || checkInOutData.CheckOut.from === "00:00" || checkInOutData.CheckOut.from === 0 ||
    !checkInOutData?.CheckOut?.till || checkInOutData.CheckOut.till === "00:00" || checkInOutData.CheckOut.till === 0 ||
    Object.keys(errors).length > 0;


  return (
    <div className="onboarding-host-div">
      <main className="page-body">
        <h2 className="onboardingSectionTitle">House rules</h2>
        <div className="houseRulesContainer">
          <div className="toggle-container">
            <HouseRuleCheckbox
              label="Allow smoking"
              value={!!houseRules.SmokingAllowed}
              onChange={(e) => handleCheckboxChange("SmokingAllowed", e.target.checked)}
            />
            <HouseRuleCheckbox
              label="Allow pets"
              value={!!houseRules.PetsAllowed}
              onChange={(e) => handleCheckboxChange("PetsAllowed", e.target.checked)}
            />
            <HouseRuleCheckbox
              label="Allow parties/events"
              value={!!houseRules["Parties/EventsAllowed"]}
              onChange={(e) => handleCheckboxChange("Parties/EventsAllowed", e.target.checked)}
            />
          </div>

          <hr />

          <TimeSelector
            label="Check-in Window"
            time={{
              from: checkInOutData?.CheckIn?.from,
              till: checkInOutData?.CheckIn?.till
            }}
            onChange={(subKey, value) => handleTimeChange("CheckIn", subKey, value)}
            error={errors.checkIn}
          />
          <TimeSelector
            label="Check-out Window"
            time={{
              from: checkInOutData?.CheckOut?.from,
              till: checkInOutData?.CheckOut?.till
            }}
            onChange={(subKey, value) => handleTimeChange("CheckOut", subKey, value)}
            error={errors.checkOut}
          />
        </div>

        <nav className="onboarding-button-box">
          <OnboardingButton
            routePath={`/hostonboarding/${accommodationType}/amenities`}
            btnText="Go back"
            variant="secondary"
          />
          <OnboardingButton
            onClick={() => {
              // Convert houseRules object from hook to array format
              const rulesArray = Object.entries(houseRules)
                .map(([ruleKey, ruleValue]) => ({ rule: ruleKey, value: !!ruleValue }));
              builder.addRules(rulesArray);

              // Convert check-in/out times (strings like "HH:MM") to numbers if model needs them
              // Using minutes from midnight as an example. Adjust if your model expects something else.
              const timeToMinutes = (timeString) => {
                if (!timeString || typeof timeString !== 'string' || !timeString.includes(':')) return 0; // Default to 0 if invalid
                const parts = timeString.split(':');
                if (parts.length !== 2) return 0;
                const [hours, minutes] = parts.map(Number);
                if (isNaN(hours) || isNaN(minutes)) return 0;
                return hours * 60 + minutes;
              };

              const checkInDataForBuilder = {
                checkIn: {
                  from: timeToMinutes(checkInOutData?.CheckIn?.from),
                  till: timeToMinutes(checkInOutData?.CheckIn?.till)
                },
                checkOut: {
                  from: timeToMinutes(checkInOutData?.CheckOut?.from),
                  till: timeToMinutes(checkInOutData?.CheckOut?.till)
                }
              };
              builder.addCheckIn(checkInDataForBuilder);

              console.log("Builder after adding rules/checkin:", builder);
              navigate(`/hostonboarding/${accommodationType}/photos`);
            }}
            btnText="Proceed"
            disabled={isProceedDisabled}
          />
        </nav>
      </main>
    </div>
  );
}

export default PropertyHouseRulesView;