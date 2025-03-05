import React from "react";
import AmenityCategory from "../components/AmenityCategory";
import useFormStore from "../stores/formStore";
import { useParams } from "react-router-dom";
import Button from "../components/button";
import "../styles/AmenityStyles.css";

const specificAmenities = {
    "General": ["WiFi", "Airco", "Onsite Parking", "Television", "Kitchen", "Washing Machine"]
};

function SpecificAmenitiesView() {
    const { type: accommodationType } = useParams();

    const selectedAmenities = useFormStore(
        (state) => state.accommodationDetails.selectedAmenities
    );
    const setAmenities = useFormStore((state) => state.setAmenities);

    const handleAmenityChange = (category, amenity, isChecked) => {
        const updatedAmenities = isChecked
            ? [...(selectedAmenities[category] || []), amenity]
            : (selectedAmenities[category] || []).filter((item) => item !== amenity);

        setAmenities(category, updatedAmenities);
    };

    const isProceedDisabled = Object.keys(selectedAmenities).every((category) => selectedAmenities[category].length === 0);

    return (
        <main className="page-body">
            <div className="container">
                <h2 className="onboardingSectionTitle">Select Specific Amenities</h2>
                <p className="onboardingSectionSubtitle">
                    Choose the specific amenities that your property offers.
                </p>
                <div className="amenity-groups">
                    {Object.keys(specificAmenities).map((category) => (
                        <AmenityCategory
                            key={category}
                            category={category}
                            amenities={specificAmenities[category]}
                            selectedAmenities={selectedAmenities[category] || []}
                            handleAmenityChange={handleAmenityChange}
                        />
                    ))}
                </div>
                <nav className="onboarding-button-box">
                    <Button routePath={`/hostonboarding/${accommodationType}/capacity`} btnText="Go back" />
                    <Button routePath={`/hostonboarding/${accommodationType}/other-amenities`} btnText="Proceed" disabled={isProceedDisabled} className={isProceedDisabled ? "button-disabled" : ""} />
                </nav>
            </div>
        </main>
    );
}

export default SpecificAmenitiesView;