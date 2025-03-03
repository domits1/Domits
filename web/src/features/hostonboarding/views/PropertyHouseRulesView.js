import React from "react";
import { useParams } from "react-router-dom";
import HouseRuleCheckbox from "../components/HouseRuleCheckbox";
import TimeSelector from "../components/TimeSelector";
import { useHouseRules } from "../hooks/useHouseRules";
import Button from "../components/button";

function HouseRulesView() {
    const { type: accommodationType } = useParams();
    const { houseRules, handleCheckboxChange, handleTimeChange } =
        useHouseRules();

    const isProceedDisabled = !houseRules.CheckIn?.From || !houseRules.CheckOut?.Til;

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