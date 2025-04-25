import {Modal, ScrollView, Text, TouchableOpacity, View} from "react-native";
import {styles} from "../styles/propertyDetailsStyles";
import React from "react";
import TranslatedText from "../../../features/translation/components/TranslatedText";
import amenities from "../../../ui-components/FeatureIcons";

const AmenitiesPopup = ({propertyAmenities, onClose}) => {

    const mappedPropertyAmenities = propertyAmenities.map(amenity =>
        amenities.find(amenitiesEntry => amenitiesEntry.id === amenity.amenityId)
    );

    const amenitiesByType = mappedPropertyAmenities.reduce((categories, amenity) => {
        if (!categories[amenity.category]) {
            categories[amenity.category] = [];
        }
        categories[amenity.category].push(amenity);
        return categories;
    }, {});

    return (
        <Modal transparent={true} visible={true} animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Text style={styles.closeButtonText}>✖</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>
                        <TranslatedText textToTranslate={"what does this place have to offer?"}/>
                    </Text>
                    <ScrollView>
                        {Object.keys(amenitiesByType).sort().map(category => {
                            const items = amenitiesByType[category];
                            return (
                                <View key={category}>
                                    <Text style={styles.categorySubTitle}>{category}</Text>
                                    <View style={styles.subCategoryDivider}/>
                                    {items.map((item, index) => (
                                        <View key={index} style={styles.categoryItem}>
                                            {item.icon}
                                            <Text style={styles.featureText}>{item.amenity}</Text>
                                        </View>
                                    ))}
                                </View>
                            );
                        })}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

export default AmenitiesPopup;