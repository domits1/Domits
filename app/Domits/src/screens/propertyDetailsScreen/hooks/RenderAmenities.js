import {Text, View} from "react-native";
import {styles} from "../styles/propertyDetailsStyles";
import featureIcons from "../../../ui-components/FeatureIcons";
import React from "react";

const RenderAmenities = (parsedAccommodation) => {
    const allAmenities = parsedAccommodation.Features || {};
    const categoriesToShow = Object.keys(allAmenities)
        .filter(category => allAmenities[category].length > 0)
        .slice(0, 3);

    return categoriesToShow.map((category, categoryIndex) => {
        const items = allAmenities[category].slice(0, 5);

        return (
            <View key={categoryIndex}>
                <Text style={styles.categorySubTitle}>{category}</Text>
                <View style={styles.subCategoryDivider}/>

                {items.map((item, itemIndex) => (
                    <View key={itemIndex} style={styles.featureIconItem}>
                        {featureIcons[item] ? (
                            <View style={styles.featureIcon}>{featureIcons[item]}</View>
                        ) : null}
                        <Text style={styles.featureText}>{item}</Text>
                    </View>
                ))}
            </View>
        );
    });
};

export default RenderAmenities;