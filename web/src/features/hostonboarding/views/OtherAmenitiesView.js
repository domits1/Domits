import React from "react";
import useFormStore from "../stores/formStore";
import { useParams } from "react-router-dom";
import Button from "../components/button";
import { amenities } from "../constants/amenitiesData";
import "../styles/OtherAmenityStyles.css";

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
        <main className="page-body centered-amenities">
            <div className="container amenity-container">
                <h2 className="onboardingSectionTitle">Select Other Amenities</h2>
                <p className="onboardingSectionSubtitle">
                    Choose the other amenities that your property offers.
                </p>
                <div className="amenity-groups">
                    {Object.keys(otherAmenities).map((category) => (
                        <div key={category} className="amenity-category">
                            <h3>{category}</h3>
                            <div className="amenity-items">
                                {otherAmenities[category].map((amenity) => (
                                    <div key={amenity} className="amenity-item">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={selectedAmenities[category]?.includes(amenity) || false}
                                                onChange={(e) => handleAmenityChange(category, amenity, e.target.checked)}
                                            />
                                            {amenity}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <nav className="onboarding-button-box">
                    <Button routePath={`/hostonboarding/${accommodationType}/specific-amenities`} btnText="Go back" />
                    <Button routePath={`/hostonboarding/${accommodationType}/rules`} btnText="Proceed" disabled={isProceedDisabled} className={isProceedDisabled ? "button-disabled" : ""} />
                </nav>
            </div>
        </main>
    );
}

export default OtherAmenitiesView;