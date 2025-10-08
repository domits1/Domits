import amenities from "../ui-components/FeatureIcons";

const amenityUtils = {
    mapPropertyAmenities(propertyAmenities) {
        return propertyAmenities.map(amenity =>
            amenities.find(amenitiesEntry => amenitiesEntry.id === amenity.amenityId)
        );
    },
    getAmenityByName(name) {
        return amenities.find(item => item.amenity === name);
    }
}

export default amenityUtils;