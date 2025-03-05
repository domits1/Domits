import React from "react";
import AmenityCategory from "../components/AmenityCategory";
import useFormStore from "../stores/formStore";
import { useParams } from "react-router-dom";
import Button from "../components/button";
import { amenities } from "../constants/amenitiesData";

function OtherAmenitiesView() {
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

    const typeAmenities =
        amenities[`${accommodationType}Amenities`] || amenities.allAmenities;

    const otherAmenities = Object.keys(typeAmenities).reduce((acc, category) => {
        if (!["WiFi", "Airco", "Onsite Parking", "Television", "Kitchen", "Washing Machine"].includes(category)) {
            acc[category] = typeAmenities[category];
        }
        return acc;
    }, {});

    const isProceedDisabled = Object.keys(selectedAmenities).every((category) => selectedAmenities[category].length === 0);

    return (
        <main className="page-body" style={{ padding: "20px", backgroundColor: "#f9f9f9" }}>
            <h2 className="onboardingSectionTitle">Select Other Amenities</h2>
            <p className="onboardingSectionSubtitle">
                Choose the other amenities that your property offers.
            </p>
            <div className="amenity-groups" style={{ display: "grid", gap: "20px" }}>
                {Object.keys(otherAmenities).map((category) => (
                    <AmenityCategory
                        key={category}
                        category={category}
                        amenities={otherAmenities[category]}
                        selectedAmenities={selectedAmenities[category] || []}
                        handleAmenityChange={handleAmenityChange}
                    />
                ))}
            </div>
            <nav className="onboarding-button-box" style={{ marginTop: "20px" }}>
                <Button routePath={`/hostonboarding/${accommodationType}/specific-amenities`} btnText="Go back" />
                <Button routePath={`/hostonboarding/${accommodationType}/rules`} btnText="Proceed" disabled={isProceedDisabled} className={isProceedDisabled ? "button-disabled" : ""} />
            </nav>
        </main>
    );
}

export default OtherAmenitiesView;