import Amenities from "../../../../store/amenities";
import Amenity from "../components/amenity";

const AmenitiesContainer = ({amenityIds}) => {
    const amenities = amenityIds.map(amenity =>
        Amenities.find(amenitiesEntry => amenitiesEntry.id === amenity.amenityId)
    );
    const featuredAmenities = amenities.filter(amenity => amenity.category === "Essentials");

    return (
      <div>
        <p className="amenities-title">This place offers the following:</p>
        <div className="essential-amenities-container">
          {featuredAmenities.map((amenity) => {
            return <Amenity key={amenity.id} amenity={amenity} />;
          })}
        </div>
      </div>
    );
};

export default AmenitiesContainer;
