import React from "react";
import { useParams } from "react-router-dom";
import { useDescription } from "../hooks/usePropertyDescription";
import TextAreaField from "../components/TextAreaField"; // Assume path is correct
import SpecificationForm from "../components/SpecificationForm";
import Button from "../components/button";
import "../styles/PropertyDescriptionView.css"; // Main view styles

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

    const currentSpecifications = accommodationType === "boat"
        ? boatSpecifications
        : accommodationType === "camper"
            ? camperSpecifications
            : {};

    const updateSpecification = accommodationType === "boat"
        ? updateBoatSpecification
        : accommodationType === "camper"
            ? updateCamperSpecification
            : () => { };

    const MIN_DESCRIPTION_LENGTH = 50;
    const MAX_DESCRIPTION_LENGTH = 500;

    const requiredBoatFields = ["Manufacturer", "Model", "GPI"];
    const requiredCamperFields = ["LicensePlate", "CamperBrand", "Model", "GPI"];

    const getRequiredFields = (type) => {
        if (type === 'boat') return requiredBoatFields;
        if (type === 'camper') return requiredCamperFields;
        return [];
    };

    const requiredFields = getRequiredFields(accommodationType);

    const requiredSpecsMissing = requiredFields.some(field => {
        const value = currentSpecifications[field];
        return value === null || value === undefined || String(value).trim() === '';
    });

    const isProceedDisabled =
        !description.trim() ||
        description.length < MIN_DESCRIPTION_LENGTH ||
        requiredSpecsMissing;

    return (
        <main className="description-view-container">
            <h2 className="onboardingSectionTitle">Provide a description</h2>
            <p className="onboardingSectionSubtitle">
                Share what makes your accommodation special.
            </p>
            <TextAreaField
                // label="Description" // Add label if needed
                value={description}
                onChange={updateDescription} // Pass the update function directly
                maxLength={MAX_DESCRIPTION_LENGTH}
                placeholder="Enter your description here..."
                required // Indicate it's required
                showCounter={true} // Explicitly show counter (default is true anyway)
                // Pass the hint text to the component
                hintText={`Minimum ${MIN_DESCRIPTION_LENGTH} characters.`}
                // Add margin if needed via a utility class or specific style in PropertyDescriptionView.css
                className="description-textarea-wrapper" // Add a class for specific margin if needed
            />

            {/* The .textarea-info div and its contents are REMOVED from here */}

            {(accommodationType === "boat" || accommodationType === "camper") && (
                <SpecificationForm
                    type={accommodationType}
                    specifications={currentSpecifications}
                    updateSpecification={updateSpecification}
                />
            )}

            <nav className="onboarding-button-box">
                <Button
                    routePath={`/hostonboarding/${accommodationType}/address`}
                    btnText="Go back"
                    variant="secondary"
                />
                <Button
                    routePath={`/hostonboarding/${accommodationType}/capacity`}
                    btnText="Proceed"
                    disabled={isProceedDisabled}
                />
            </nav>
        </main>
    );
}

export default DescriptionView;