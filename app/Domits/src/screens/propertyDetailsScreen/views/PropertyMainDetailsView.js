import {Text, View} from "react-native";
import {styles} from "../styles/propertyDetailsStyles";
import TranslatedText from "../../../features/translation/components/TranslatedText";
import React from "react";
import featureIcons from "../../../ui-components/FeatureIcons";

const PropertyMainDetailsView = ({property}) => {
    const renderDateRange = () => {
        const dateRanges = property.DateRanges || [];

        if (dateRanges.length === 0) {
            return null;
        }

        const sortedRanges = dateRanges.sort(
            (a, b) => new Date(a.startDate) - new Date(b.startDate),
        );

        const earliestDate = new Date(sortedRanges[0].startDate);
        const latestDate = new Date(sortedRanges[sortedRanges.length - 1].endDate);

        const formatDate = date => {
            const day = date.toLocaleDateString('en-US', {
                day: 'numeric',
                timeZone: 'UTC',
            });
            const month = date.toLocaleDateString('en-US', {
                month: 'long',
                timeZone: 'UTC',
            });
            return `${day} ${month}`;
        };

        return (
            <View>
                <Text>
                    {formatDate(earliestDate)} - {formatDate(latestDate)}
                </Text>
            </View>
        );
    };

    return (
        <View>
            <View style={styles.mainDetailsContainer}>
                <Text style={styles.subtitleText}>
                    {property.property.subtitle.trim()}
                </Text>
                <Text style={styles.costPerNightText}>
                    €{Number(property.pricing.roomRate).toFixed(2)} {" "}
                    <TranslatedText textToTranslate={"per night"}/>
                </Text>
                <Text>{renderDateRange()}</Text>
            </View>

            <View style={styles.borderContainer}>
                {property.generalDetails.map((item, index) => (
                    <View style={styles.mainAmenityContainer} key={item.detail + index}>
                        <View style={styles.featureIcon}>
                            {featureIcons.find(icon => item.detail === icon.amenity)?.icon}
                        </View>
                        <Text style={styles.mainAmenitiesText}>
                            {item.value} <TranslatedText textToTranslate={item.detail}/>
                        </Text>
                    </View>
                ))}

                <View style={styles.descriptionContainer}>
                    <Text style={styles.descriptionText}>
                        {property.property.description.trim()}
                    </Text>
                </View>
            </View>
        </View>
    )
}

export default PropertyMainDetailsView;