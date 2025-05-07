import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import HouseRuleCheckbox from "../components/HouseRuleCheckbox";
import TimeSelector from "../components/TimeSelector";
import { useHouseRules } from "../hooks/usePropertyHouseRules"; // Hook updates store
import OnboardingButton from "../components/OnboardingButton";
import "../styles/onboardingHost.scss";
import { toast } from "react-toastify";

const timeToMinutes = (timeString) => {
  if (!timeString || typeof timeString !== "string" || !timeString.includes(":")) return null;
  const parts = timeString.split(":");
  if (parts.length !== 2) return null;
  const [hours, minutes] = parts.map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

const defaultCheckIn = { from: "15:00", till: "22:00" };
const defaultCheckOut = { from: "08:00", till: "11:00" };

function PropertyHouseRulesView() {
  const navigate = useNavigate();
  const { type: accommodationType } = useParams();

  const { houseRules, checkInOutData, handleCheckboxChange, handleTimeChange, setDefaultTimes } =
    useHouseRules();

  const [errors, setErrors] = useState({});

  // Set default times if not already set
  useEffect(() => {
    if (!checkInOutData?.CheckIn || !checkInOutData?.CheckOut) {
      setDefaultTimes(defaultCheckIn, defaultCheckOut);
    }
  }, [checkInOutData, setDefaultTimes]);

  const isProceedDisabled = useMemo(() => {
    const checkInValid =
      checkInOutData?.CheckIn?.from &&
      checkInOutData.CheckIn.from !== "00:00" &&
      checkInOutData?.CheckIn?.till &&
      checkInOutData.CheckIn.till !== "00:00";
    const checkOutValid =
      checkInOutData?.CheckOut?.from &&
      checkInOutData.CheckOut.from !== "00:00" &&
      checkInOutData?.CheckOut?.till &&
      checkInOutData.CheckOut.till !== "00:00";
    return !checkInValid || !checkOutValid || Object.keys(errors).length > 0;
  }, [checkInOutData, errors]);

  const handleProceed = useCallback(() => {
    if (isProceedDisabled) {
      toast.warn("Please correct the errors in the check-in/out times.");
      return;
    }

    console.log("Proceeding from House Rules. Data in store:", { houseRules, checkInOutData });
    navigate(`/hostonboarding/${accommodationType}/photos`);
  }, [navigate, accommodationType, houseRules, checkInOutData, isProceedDisabled]);

  return (
    <div className="onboarding-host-div">
      <main className="page-body">
        <h2 className="onboardingSectionTitle">House rules & Check-in/-out</h2>
        <div className="houseRulesContainer">
          <div className="toggle-container">
            <h3 className="rules-subsection-title">General Rules</h3>
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

          <hr className="rules-divider" />

          <h3 className="rules-subsection-title">Check-in / Check-out Windows</h3>
          <TimeSelector
            label="Check-in Window"
            time={checkInOutData?.CheckIn || defaultCheckIn}
            onChange={(subKey, value) => handleTimeChange("CheckIn", subKey, value)}
            error={errors.checkIn}
          />
          <TimeSelector
            label="Check-out Window"
            time={checkInOutData?.CheckOut || defaultCheckOut}
            onChange={(subKey, value) => handleTimeChange("CheckOut", subKey, value)}
            error={errors.checkOut}
          />
        </div>

        <nav className="onboarding-button-box">
          <OnboardingButton
            routePath={`/hostonboarding/${accommodationType}/amenities`}
            btnText="Go back"
          />
          <OnboardingButton
            onClick={handleProceed}
            btnText="Proceed"
            disabled={isProceedDisabled}
          />
        </nav>
      </main>
    </div>
  );
}

export default PropertyHouseRulesView;