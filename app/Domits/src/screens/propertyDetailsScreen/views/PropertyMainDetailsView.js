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
                    {property.Subtitle.trim()}
                </Text>
                <Text style={styles.costPerNightText}>
                    €{Number(property.Rent).toFixed(2)} {" "}
                    <TranslatedText textToTranslate={"per night"}/>
                </Text>
                <Text>{renderDateRange()}</Text>
            </View>

            <View style={styles.borderContainer}>
                <View style={styles.mainAmenityContainer}>
                    <View style={styles.featureIcon}>
                        {featureIcons["Multiple guests"]}
                    </View>
                    <Text style={styles.mainAmenitiesText}>
                        {property.GuestAmount} <TranslatedText textToTranslate={"guests"}/>
                    </Text>
                </View>
                <View style={styles.mainAmenityContainer}>
                    <View style={styles.featureIcon}>
                        {featureIcons["Bedroom"]}
                    </View>
                    <Text style={styles.mainAmenitiesText}>
                        {property.bedrooms || 0} <TranslatedText textToTranslate={"bedrooms"}/>
                    </Text>
                </View>
                <View style={styles.mainAmenityContainer}>
                    <View style={styles.featureIcon}>
                        {featureIcons["Bed"]}
                    </View>
                    <Text style={styles.mainAmenitiesText}>
                        {property.Beds} <TranslatedText textToTranslate={"beds"}/>
                    </Text>
                </View>
                <View style={styles.mainAmenityContainer}>
                    <View style={styles.featureIcon}>
                        {featureIcons["Bathroom"]}
                    </View>
                    <Text style={styles.mainAmenitiesText}>
                        {property.Bathrooms} <TranslatedText textToTranslate={"bathrooms"}/>
                    </Text>
                </View>
            </View>


            <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionText}>
                    {property.Description.trim()}
                </Text>
            </View>

        </View>
    )
}

export default PropertyMainDetailsView;