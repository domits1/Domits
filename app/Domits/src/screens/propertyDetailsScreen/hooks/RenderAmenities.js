import {Text, View} from "react-native";
import {styles} from "../styles/propertyDetailsStyles";
import React from "react";
import mapPropertyAmenities from "./mapPropertyAmenities";

const RenderAmenities = ({propertyAmenities, categoriesToSlice}) => {

    const mappedPropertyAmenities = mapPropertyAmenities(propertyAmenities);

    const amenitiesByType = mappedPropertyAmenities.reduce((categories, amenity) => {
        if (!categories[amenity.category]) {
            categories[amenity.category] = [];
        }
        categories[amenity.category].push(amenity);
        return categories;
    }, {});

    const categoriesToShow = Object.keys(amenitiesByType).slice(0, categoriesToSlice);

    return categoriesToShow.sort().map((category) => {
        const items = amenitiesByType[category];
        return (
            <View key={category}>
                <Text style={styles.categorySubTitle}>{category}</Text>
                <View style={styles.subCategoryDivider}/>

                {items.map((amenity) => (
                    <View key={amenity.id} style={styles.featureIconItem}>
                        {amenity.icon}
                        <Text style={styles.featureText}>{amenity.amenity}</Text>
                    </View>
                ))}
            </View>
        );
    });
};

export default RenderAmenities;