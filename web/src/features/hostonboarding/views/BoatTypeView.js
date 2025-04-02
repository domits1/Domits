import React from "react";
import BoatTypeSelector from "../components/TypeSelector";
import { boatData } from "../constants/boatData";
import useFormStore from "../stores/formStore";
import Button from "../components/button";

function BoatTypeView() {
    const setBoatType = useFormStore((state) => state.setBoatType);
    const selectedBoatType = useFormStore(
        (state) => state.accommodationDetails.boatType
    );
    const isProceedDisabled = !selectedBoatType;

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
                <Button
                    routePath="/hostonboarding/boat/title"
                    btnText="Proceed"
                    disabled={isProceedDisabled}
                    className={isProceedDisabled ? "button-disabled" : ""}
                />
            </nav>
        </main>
    );
}

export default BoatTypeView;