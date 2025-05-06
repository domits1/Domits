import {Text, TouchableOpacity, View} from "react-native";
import {styles} from "../styles/propertyDetailsStyles";
import TranslatedText from "../../../features/translation/components/TranslatedText";
import RenderAmenities from "../hooks/RenderAmenities";
import AmenitiesPopup from "../components/amenitiesPopup";
import React from "react";

const AmenitiesView = ({property, toggleAmenitiesModal, showAmenitiesModal}) => {
    return (
        <>
            <Text style={styles.categoryTitle}>
                <TranslatedText textToTranslate={'Amenities'}/>
            </Text>
            <View style={styles.amenities}>
                <RenderAmenities propertyAmenities={property.amenities} categoriesToSlice={3} />
            </View>
            <TouchableOpacity
                onPress={toggleAmenitiesModal}
                style={styles.ShowAllAmenitiesButton}>
                <Text style={styles.ShowAllAmenitiesButtonText}>
                    <TranslatedText textToTranslate={'Show all amenities'} />
                </Text>
            </TouchableOpacity>
            {showAmenitiesModal && (
                <AmenitiesPopup
                    propertyAmenities={property.amenities}
                    onClose={toggleAmenitiesModal}
                />
            )}
        </>
    )
}

export default AmenitiesView;