import React from "react";
import { useParams } from "react-router-dom";
import { useDescription } from "../hooks/useDescription";
import TextAreaField from "../components/TextAreaField";
import SpecificationForm from "../components/SpecificationForm";
import Button from "../components/button";

function DescriptionView() {
    const { type: accommodationType } = useParams();
    const {
        description,
        boatSpecifications,
        camperSpecifications,
        updateDescription,
        updateBoatSpecification,
        updateCamperSpecification,
    } = useDescription();

    const specifications =
        accommodationType === "boat"
            ? boatSpecifications
            : accommodationType === "camper"
                ? camperSpecifications
                : null;
    const updateSpecification =
        accommodationType === "boat"
            ? updateBoatSpecification
            : accommodationType === "camper"
                ? updateCamperSpecification
                : null;

    const MIN_DESCRIPTION_LENGTH = 50;
    const isProceedDisabled = !description.trim() || description.length < MIN_DESCRIPTION_LENGTH || (specifications && specifications.some(spec => !spec.value.trim()));

    return (
        <main className="container">
            <h2 className="onboardingSectionTitle">Provide a description</h2>
            <p className="onboardingSectionSubtitle">
                Share what makes your accommodation special.
            </p>
            <TextAreaField
                value={description}
                onChange={updateDescription}
                maxLength={500}
                placeholder="Enter your description here..."
            />
            <p className="description-hint">
                Please enter at least 50 characters.
            </p>
            <SpecificationForm
                type={accommodationType}
                specifications={specifications}
                updateSpecification={updateSpecification}
            />
            <nav className="onboarding-button-box">
                <Button
                    routePath={`/hostonboarding/${accommodationType}/address`}
                    btnText="Go back"
                />
                <Button
                    routePath={`/hostonboarding/${accommodationType}/capacity`}
                    btnText="Proceed"
                    disabled={isProceedDisabled}
                    className={isProceedDisabled ? "button-disabled" : ""}
                />
            </nav>
        </main>
    );
}

export default DescriptionView;