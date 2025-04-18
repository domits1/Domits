import React, { useState } from "react";

import { useParams } from "react-router-dom";
import AmenityCategory from "../components/AmenityCategory";
import OnboardingButton from "../components/OnboardingButton";
import { useBuilder } from "../../../context/propertyBuilderContext";
import amenities from "../../../store/amenities";

const AmenitiesView = () => {
  const builder = useBuilder();

  const { type: accommodationType } = useParams();

  const amenitiesByType = amenities.reduce((categories, amenity) => {
    if (!categories[amenity.category]) {
      categories[amenity.category] = [];
    }
    categories[amenity.category].push(amenity);
    return categories;
  }, {});

  const [selectedAmenities, setSelectedAmenities] = useState([]);

  const handleAmenityChange = (amenity) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities(selectedAmenities.filter((amenity) => amenity !== amenity));
    } else {
      setSelectedAmenities([...selectedAmenities, amenity]);
    }
  };

  return (
    <div className="onboarding-host-div">
      <div className="page-body">
        <div className="onboarding-host-div">
          <h2 className="onboardingSectionTitle">Select Amenities</h2>
          <p className="onboardingSectionSubtitle">Choose the amenities that your property offers.</p>
          <div className="amenity-groups">
            {Object.keys(amenitiesByType).map((category) => (
              <AmenityCategory
                key={category}
                category={category}
                amenities={amenitiesByType[category]}
                selectedAmenities={selectedAmenities}
                handleAmenityChange={handleAmenityChange}
              />
            ))}
          </div>
          <nav className="onboarding-button-box">
            <OnboardingButton routePath={`/hostonboarding/${accommodationType}/capacity`} btnText="Go back" />
            <OnboardingButton
              onClick={() => {
                builder.addAmenities(selectedAmenities);
                console.log(builder);
              }}
              routePath={`/hostonboarding/${accommodationType}/rules`}
              btnText="Proceed"
            />
          </nav>
        </div>
      </div>
    </div>
  );
};

export default AmenitiesView;
