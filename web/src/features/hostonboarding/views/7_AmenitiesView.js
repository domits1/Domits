import React, { useState } from "react";
import AmenityCategory from "../components/AmenityCategory";
import OnboardingButton from "../components/OnboardingButton";
import { useBuilder } from "../../../context/propertyBuilderContext";
import amenities from "../../../store/amenities";
import "../styles/onboardingHost.scss";
import { useParams, useNavigate } from "react-router-dom";

const AmenitiesView = () => {
  const builder = useBuilder();
  const navigate = useNavigate();

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
      setSelectedAmenities(selectedAmenities.filter((a) => a !== amenity));
    } else {
      setSelectedAmenities([...selectedAmenities, amenity]);
    }
  };

  const isProceedDisabled = Object.values(selectedAmenities || {}).every(
    (list) => list.length === 0
  );

  return (
    <div className="onboarding-host-div">
      <div className="amenity-container">
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
              console.log("Builder after adding amenities:", builder);
              navigate(`/hostonboarding/${accommodationType}/rules`);
            }}
            routePath={`/hostonboarding/${accommodationType}/rules`}
            btnText="Proceed"
            disabled={isProceedDisabled}
          />
        </nav>
      </div>
    </div>
  );
};

export default AmenitiesView;