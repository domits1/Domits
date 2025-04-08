import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View,} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {styles} from "./styles/PropertiesSearchResultsStyles";
import FormatAccommodationData from "../../components/utils/mappings/FormatAccommodationData";
import TranslatedText from "../translation/components/TranslatedText";
import FetchAccommodationsData from "./hooks/FetchAccommodationsData";
import NavigateTo from "../../navigation/NavigationFunctions";

const PropertiesSearchResultsScreen = ({searchResults}) => {
    const [accommodationsList, setAccommodationsList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [containerWidth, setContainerWidth] = useState(null);
    const navigation = useNavigation();

    useEffect(() => {
        if (searchResults && searchResults.length > 0) {
            setAccommodationsList(FormatAccommodationData(searchResults));
        } else {
            FetchAccommodationsData(setAccommodationsList, setLoading, FormatAccommodationData);
        }
    }, [searchResults]);

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="green"/>
            </View>
        );
    }

    /**
     * Go to the details page of the pressed accommodation.
     * @param accommodationId - The id of the accommodation that is pressed on.
     */
    const handleAccommodationPress = accommodationId => {
        NavigateTo(navigation, {accommodationId: accommodationId}).detailPage();
    };

    /**
     * Render a Text component for accommodation specifications
     * @param value - Specification value to be displayed
     * @param suffix - Optional string to appended
     * @returns {JSX.Element|null} - A text component or null if the value is undefined
     */
    const renderSpecText = (value, suffix = '') => {
        return value !== undefined ? <Text style={styles.spec}>{value} {suffix}</Text> : null;
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            {accommodationsList.map(accommodation => (
                <TouchableOpacity
                    style={[styles.card, containerWidth ? { width: containerWidth } : null]}
                    key={accommodation.id}
                    onPress={() => handleAccommodationPress(accommodation.id)}>
                    <Image source={{uri: accommodation.image}}
                           style={styles.image}
                           onLayout={(event) => {
                               const { width } = event.nativeEvent.layout;
                               setContainerWidth(width);
                           }}
                    />
                    <View style={styles.cardContent}>
                        <Text style={styles.title}>
                            {accommodation.city}, {accommodation.country}
                        </Text>
                        <Text style={styles.price}>€{accommodation.price} <TranslatedText textToTranslate={'per night'}/></Text>
                        <Text style={styles.details} numberOfLines={3}>{accommodation.details}</Text>
                        <View style={styles.specs}>
                            {renderSpecText(accommodation.beds, <TranslatedText textToTranslate={'beds'} />)}
                            {renderSpecText(accommodation.bedrooms, <TranslatedText textToTranslate={'bedrooms'} />)}
                            {renderSpecText(accommodation.bathrooms, <TranslatedText textToTranslate={'bathrooms'} />)}
                            {renderSpecText(accommodation.guests, <TranslatedText textToTranslate={'guests'} />)}
                        </View>
                    </View>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
};

export default PropertiesSearchResultsScreen;
