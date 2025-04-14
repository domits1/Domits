import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import HouseRuleCheckbox from "../components/HouseRuleCheckbox";
import TimeSelector from "../components/TimeSelector";
import { useHouseRules } from "../hooks/usePropertyHouseRules";
import Button from "../components/OnboardingButton";
import "../styles/PropertyHouseRules.css";

const timeToMinutes = (timeString) => {
  if (!timeString || typeof timeString !== 'string' || !timeString.includes(':')) return null;
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

const defaultCheckIn = { From: "15:00", Til: "22:00" };
const defaultCheckOut = { From: "08:00", Til: "11:00" };

function PropertyHouseRulesView() {
  const { type: accommodationType } = useParams();
  const { houseRules, setHouseRule, handleCheckboxChange, handleTimeChange } =
      useHouseRules();

  const [errors, setErrors] = useState({});

  useEffect(() => {
    const checkInNeedsDefaults =
        !houseRules.CheckIn ||
        (!houseRules.CheckIn.From || houseRules.CheckIn.From === "00:00") ||
        (!houseRules.CheckIn.Til || houseRules.CheckIn.Til === "00:00");

    const checkOutNeedsDefaults =
        !houseRules.CheckOut ||
        (!houseRules.CheckOut.From || houseRules.CheckOut.From === "00:00") ||
        (!houseRules.CheckOut.Til || houseRules.CheckOut.Til === "00:00");

    if (checkInNeedsDefaults) {
      if (setHouseRule) {
        try {
          setHouseRule("CheckIn", { ...defaultCheckIn });
        } catch (e) { console.error("Error setting CheckIn defaults:", e); }
      } else if (handleTimeChange) {
        handleTimeChange("CheckIn", "From", defaultCheckIn.From);
        handleTimeChange("CheckIn", "Til", defaultCheckIn.Til);
      }
    }

    if (checkOutNeedsDefaults) {
      if (setHouseRule) {
        try {
          setHouseRule("CheckOut", { ...defaultCheckOut });
        } catch (e) { console.error("Error setting CheckOut defaults:", e); }
      } else if (handleTimeChange) {
        handleTimeChange("CheckOut", "From", defaultCheckOut.From);
        handleTimeChange("CheckOut", "Til", defaultCheckOut.Til);
      }
    }
  }, [houseRules, setHouseRule, handleTimeChange]);

  useEffect(() => {
    const newErrors = {};
    const checkInFrom = timeToMinutes(houseRules.CheckIn?.From);
    const checkInTil = timeToMinutes(houseRules.CheckIn?.Til);
    const checkOutFrom = timeToMinutes(houseRules.CheckOut?.From);
    const checkOutTil = timeToMinutes(houseRules.CheckOut?.Til);

    if (!houseRules.CheckIn?.From || houseRules.CheckIn.From === "00:00") newErrors.checkIn = { field: 'From', message: 'Check-in From time is required.' };
    if (!houseRules.CheckOut?.Til || houseRules.CheckOut.Til === "00:00") newErrors.checkOut = { field: 'Til', message: 'Check-out Til time is required.' };

    if (checkInFrom !== null && checkInTil !== null && checkInTil < checkInFrom) {
      if (!newErrors.checkIn) {
        newErrors.checkIn = { field: 'Til', message: 'Check-in "Til" time must be the same as or later than "From" time.' };
      }
    }
    if (checkOutFrom !== null && checkOutTil !== null && checkOutTil < checkOutFrom) {
      if (!newErrors.checkOut) {
        newErrors.checkOut = { field: 'Til', message: 'Check-out "Til" time must be the same as or later than "From" time.' };
      }
    }

    setErrors(newErrors);

  }, [houseRules.CheckIn, houseRules.CheckOut]);

  const isProceedDisabled =
      !houseRules.CheckIn?.From || houseRules.CheckIn.From === "00:00" ||
      !houseRules.CheckOut?.Til || houseRules.CheckOut.Til === "00:00" ||
      Object.keys(errors).length > 0;

  return (
      <div className="onboarding-host-div">
        <main className="page-body">
          <h2 className="onboardingSectionTitle">House rules</h2>
          <div className="houseRulesContainer">
            <div className="toggle-container">
              <HouseRuleCheckbox
                  label="Allow smoking"
                  value={!!houseRules.AllowSmoking}
                  onChange={(e) => handleCheckboxChange("AllowSmoking", e.target.checked)}
              />
              <HouseRuleCheckbox
                  label="Allow pets"
                  value={!!houseRules.AllowPets}
                  onChange={(e) => handleCheckboxChange("AllowPets", e.target.checked)}
              />
              <HouseRuleCheckbox
                  label="Allow parties/events"
                  value={!!houseRules.AllowParties}
                  onChange={(e) => handleCheckboxChange("AllowParties", e.target.checked)}
              />
            </div>

            <hr />

            <TimeSelector
                label="Check-in Window"
                time={houseRules.CheckIn || {}}
                onChange={(subKey, value) => handleTimeChange("CheckIn", subKey, value)}
                error={errors.checkIn}
            />
            <TimeSelector
                label="Check-out Window"
                time={houseRules.CheckOut || {}}
                onChange={(subKey, value) => handleTimeChange("CheckOut", subKey, value)}
                error={errors.checkOut}
            />
          </div>

          <nav className="onboarding-button-box">
            <Button
                routePath={`/hostonboarding/${accommodationType}/amenities`}
                btnText="Go back"
                variant="secondary"
            />
            <Button
                routePath={`/hostonboarding/${accommodationType}/photos`}
                btnText="Proceed"
                disabled={isProceedDisabled}
            />
          </nav>
        </main>
      </div>
  );
}

export default PropertyHouseRulesView;