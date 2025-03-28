import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View,} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import FetchAccommodationsData from '../features/search/FetchAccommodationsData'
import FormatAccommodationData from "../components/utils/mappings/FormatAccommodationData";
import TranslatedText from "../features/translation/components/TranslatedText";

const Accommodations = ({searchResults}) => {
    const [accommodationsList, setAccommodationsList] = useState([]);
    const [loading, setLoading] = useState(true);
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
                <ActivityIndicator size="large" color="#0000ff"/>
            </View>
        );
    }

    /**
     * Go to the details page of the pressed accommodation
     * @param accommodation - The accommodation pressed on
     */
    const handleAccommodationPress = accommodation => {
        navigation.navigate('Detailpage', {accommodation});
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
                    style={styles.card}
                    key={accommodation.id}
                    onPress={() => handleAccommodationPress(accommodation)}>
                    <Image source={{uri: accommodation.image}} style={styles.image}/>
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

const styles = StyleSheet.create({
    container: {
        padding: 20,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 10,
        overflow: 'hidden',
        marginBottom: 20,
    },
    image: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 15,
        aspectRatio: 1,
        alignSelf: 'center'
    },
    cardContent: {
        padding: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    price: {
        fontSize: 16,
        color: 'black',
        fontWeight: 'bold',
        textDecorationLine: 'underline'
    },
    details: {
        fontSize: 14,
        marginTop: 5,
    },
    specs: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 10,
    },
    spec: {
        fontSize: 12,
        color: '#555',
    },
});

export default Accommodations;
