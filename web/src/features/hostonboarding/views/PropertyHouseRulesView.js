// --- START OF FILE PropertyHouseRulesView.js ---

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import HouseRuleCheckbox from "../components/HouseRuleCheckbox";
import TimeSelector from "../components/TimeSelector";
import { useHouseRules } from "../hooks/usePropertyHouseRules";
import Button from "../components/button";
import "../styles/PropertyHouseRules.css";

// Helper function (remains the same)
const timeToMinutes = (timeString) => {
    if (!timeString || typeof timeString !== 'string' || !timeString.includes(':')) return null;
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
};

// Defaults (remain the same)
const defaultCheckIn = { From: "15:00", Til: "22:00" }; // 3:00 PM - 10:00 PM
const defaultCheckOut = { From: "08:00", Til: "11:00" }; // 8:00 AM - 11:00 AM

function HouseRulesView() {
    const { type: accommodationType } = useParams();
    const { houseRules, setHouseRule, handleCheckboxChange, handleTimeChange } =
        useHouseRules();

    const [errors, setErrors] = useState({});

    // --- Set Default Times on Mount (Logic Updated for "00:00") ---
    useEffect(() => {
        // Check if CheckIn needs defaults (is null/undefined OR has "00:00" or empty values)
        const checkInNeedsDefaults =
            !houseRules.CheckIn ||
            (!houseRules.CheckIn.From || houseRules.CheckIn.From === "00:00") ||
            (!houseRules.CheckIn.Til || houseRules.CheckIn.Til === "00:00");

        // Check if CheckOut needs defaults (is null/undefined OR has "00:00" or empty values)
        const checkOutNeedsDefaults =
            !houseRules.CheckOut ||
            (!houseRules.CheckOut.From || houseRules.CheckOut.From === "00:00") ||
            (!houseRules.CheckOut.Til || houseRules.CheckOut.Til === "00:00");

        console.log(`Default Check Effect: CheckIn Needs Defaults: ${checkInNeedsDefaults}, CheckOut Needs Defaults: ${checkOutNeedsDefaults}`);
        console.log('Current state:', JSON.stringify(houseRules));

        if (checkInNeedsDefaults) {
            console.log("Applying CheckIn defaults...");
            if (setHouseRule) {
                try {
                    setHouseRule("CheckIn", { ...defaultCheckIn });
                } catch (e) { console.error("Error setting CheckIn defaults:", e); }
            } else if (handleTimeChange) {
                handleTimeChange("CheckIn", "From", defaultCheckIn.From);
                handleTimeChange("CheckIn", "Til", defaultCheckIn.Til);
            } else { console.warn("No setter for CheckIn defaults"); }
        }

        if (checkOutNeedsDefaults) {
            console.log("Applying CheckOut defaults...");
            if (setHouseRule) {
                try {
                    setHouseRule("CheckOut", { ...defaultCheckOut });
                } catch (e) { console.error("Error setting CheckOut defaults:", e); }
            } else if (handleTimeChange) {
                handleTimeChange("CheckOut", "From", defaultCheckOut.From);
                handleTimeChange("CheckOut", "Til", defaultCheckOut.Til);
            } else { console.warn("No setter for CheckOut defaults"); }
        }

        // Dependencies remain - ensures effect runs if state loads async or setters change
    }, [houseRules, setHouseRule, handleTimeChange]);


    // --- Validation Logic (remains the same) ---
    useEffect(() => {
        const newErrors = {};
        const checkInFrom = timeToMinutes(houseRules.CheckIn?.From);
        const checkInTil = timeToMinutes(houseRules.CheckIn?.Til);
        const checkOutFrom = timeToMinutes(houseRules.CheckOut?.From);
        const checkOutTil = timeToMinutes(houseRules.CheckOut?.Til);

        // Use "00:00" as an indicator of not-yet-set for required checks if needed
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

    // Disable Proceed Button Logic (Updated for "00:00")
    const isProceedDisabled =
        !houseRules.CheckIn?.From || houseRules.CheckIn.From === "00:00" || // Check From explicitly
        !houseRules.CheckOut?.Til || houseRules.CheckOut.Til === "00:00" || // Check Til explicitly
        Object.keys(errors).length > 0;


    return (
        <main className="page-body">
            <h2 className="onboardingSectionTitle">House rules</h2>
            <div className="houseRulesContainer">
                {/* Toggles */}
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

                {/* Time selectors */}
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

            {/* Navigation Buttons */}
            <nav className="onboarding-button-box">
                <Button
                    routePath={`/hostonboarding/${accommodationType}/amenities`}
                    btnText="Go back"
                />
                <Button
                    routePath={`/hostonboarding/${accommodationType}/photos`}
                    btnText="Proceed"
                    disabled={isProceedDisabled}
                    className={isProceedDisabled ? "button-disabled" : ""}
                />
            </nav>
        </main>
    );
}

export default HouseRulesView;
// --- END OF FILE PropertyHouseRulesView.js ---