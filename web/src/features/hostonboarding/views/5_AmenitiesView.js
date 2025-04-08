import { amenities } from "../constants/propertyAmenitiesData";
import AmenityCategory from "../components/AmenityCategory";
import useFormStore from "../stores/formStore";
import { useParams } from "react-router-dom";
import OnboardingButton from "../components/OnboardingButton";
import "../styles/onboardingHost.css"

function AmenitiesView() {
  const { type: accommodationType } = useParams();

  const selectedAmenities = useFormStore(
    (state) => state.accommodationDetails.selectedAmenities,
  )
  const setAmenities = useFormStore((state) => state.setAmenities)

  const handleAmenityChange = (category, amenity, isChecked) => {
    const updatedAmenities = isChecked
      ? [...(selectedAmenities[category] || []), amenity]
      : (selectedAmenities[category] || []).filter((item) => item !== amenity);

    setAmenities(category, updatedAmenities);
  };

  const typeAmenities =
    amenities[`${accommodationType}Amenities`] || amenities.allAmenities;

  return (
    <main className="page-body">
      <h2 className="onboardingSectionTitle">Select Amenities</h2>
      <p className="onboardingSectionSubtitle">
        Choose the amenities that your property offers.
      </p>
      <div className="amenity-groups">
        {Object.keys(typeAmenities).map((category) => (
          <AmenityCategory
            key={category}
            category={category}
            amenities={typeAmenities[category]}
            selectedAmenities={selectedAmenities[category] || []}
            handleAmenityChange={handleAmenityChange}
          />
        ))}
      </div>
      <nav className="onboarding-button-box">
        <OnboardingButton routePath={`/hostonboarding/${accommodationType}/capacity`} btnText="Go back" />
        <OnboardingButton routePath={`/hostonboarding/${accommodationType}/rules`} btnText="Proceed" />
      </nav>
    </main>
  );
}

export default AmenitiesView;
