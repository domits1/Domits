import amenities from "../../../ui-components/FeatureIcons";

function mapPropertyAmenities(propertyAmenities) {
    return propertyAmenities.map(amenity =>
        amenities.find(amenitiesEntry => amenitiesEntry.id === amenity.amenityId)
    );
}

export default mapPropertyAmenities;