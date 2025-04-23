import React, {useEffect, useState} from 'react';
import {ScrollView, Text, ToastAndroid, TouchableOpacity, View,} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import FetchAccommodation from '../../../features/search/hooks/FetchAccommodation';
import Ionicons from "react-native-vector-icons/Ionicons";
import {styles} from "../styles/propertyDetailsStyles";
import AmenitiesPopup from "../components/AmenitiesPopup";
import SelectBookingDatesCalendarView from "../views/SelectBookingDatesCalendarView";
import TranslatedText from "../../../features/translation/components/TranslatedText";
import CalculateNumberOfNights from "../../../features/bookingengine/utils/CalculateNumberOfNights";
import RenderAmenities from "../hooks/RenderAmenities";
import PropertyImagesView from "../views/PropertyImagesView";
import LoadingScreen from "../../loadingscreen/screens/LoadingScreen";
import PropertyMainDetailsView from "../views/PropertyMainDetailsView";
import HostSectionView from "../../hostdashboard/components/HostSectionView";
import {BOOKING_PROCESS_SCREEN, HOME_SCREEN} from "../../../navigation/utils/NavigationNameConstants";

const PropertyDetailsScreen = ({route, navigation}) => {
    const accommodationId = route.params.accommodationId;
    const [parsedAccommodation, setParsedAccommodation] = useState({});
    const [loading, setLoading] = useState(true);
    const [images, setImages] = useState([]);
    const [showAmenitiesModal, setShowAmenitiesModal] = useState(false);
    const [firstSelectedDate, setFirstSelectedDate] = useState(null);
    const [lastSelectedDate, setLastSelectedDate] = useState(null);
    const [amountOfNights, setAmountOfNights] = useState(null);
    const [costOfNights, setCostOfNights] = useState(null);
    const [totalCost, setTotalCost] = useState(null);

    /**
     * Fetch current accommodation data.
     */
    useEffect(() => {
        FetchAccommodation(accommodationId, setParsedAccommodation, setLoading).then().catch(error => {
            console.error('Error fetching accommodation:', error);
        });
    }, [accommodationId]);

    useEffect(() => {
        if (parsedAccommodation && parsedAccommodation.Images) {
            const originalImages = parsedAccommodation.Images;

            const updatedImages = Object.entries(originalImages)
                .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
                .map(([key, url]) => {
                    const updatedUrl = url.replace('detail', 'mobile');
                    return {uri: updatedUrl};
                });
            setImages(updatedImages);
        } else if (!loading) {
            console.warn('No Images object found in parsed accommodation data.');
        }
    }, [parsedAccommodation, loading]);

    useEffect(() => {
        CalculateNumberOfNights(firstSelectedDate, lastSelectedDate, setAmountOfNights);
    }, [lastSelectedDate]);

    useEffect(() => {
        const totalCostOfNights = parsedAccommodation.Rent * amountOfNights
        setCostOfNights(totalCostOfNights);
        const totalCostOfBooking = totalCostOfNights + parsedAccommodation.CleaningFee + parsedAccommodation.ServiceFee;
        setTotalCost(totalCostOfBooking);
    }, [amountOfNights, parsedAccommodation]);

    const handleHomeScreenPress = () => {
        navigation.navigate(HOME_SCREEN);
    };

    const handleFirstDateSelected = (date) => {
        setFirstSelectedDate(date);
    };

    const handleLastDateSelected = (date) => {
        setLastSelectedDate(date);
    }

    const handleOnBookPress = () => {
        if (!firstSelectedDate || !lastSelectedDate) {
            ToastAndroid.show("Please select a start and end date", ToastAndroid.SHORT)
        } else {
            navigation.navigate(BOOKING_PROCESS_SCREEN, {firstSelectedDate,
                lastSelectedDate,
                parsedAccommodation,
                images,})
        }
    };

    const toggleAmenitiesModal = () => {
        setShowAmenitiesModal(!showAmenitiesModal);
    };

    if (loading) {
        return <LoadingScreen loadingName={"property"}/>
    }

    return (
        <SafeAreaView style={{flex: 1}}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleHomeScreenPress}>
                        <Ionicons
                            name="chevron-back-outline"
                            size={24}
                            style={styles.headerIcon}
                        />
                    </TouchableOpacity>
                    <Text style={styles.titleText}>{parsedAccommodation.Title}</Text>
                </View>

                <ScrollView style={styles.contentContainer}>
                    <PropertyImagesView
                        images={images}
                    />

                    <View style={styles.propertyDetailsContainer}>
                        <PropertyMainDetailsView
                            property={parsedAccommodation}
                        />

                        <SelectBookingDatesCalendarView
                            onFirstDateSelected={handleFirstDateSelected}
                            onLastDateSelected={handleLastDateSelected}
                            property={parsedAccommodation}
                            handleOnBookPress={handleOnBookPress}
                        ></SelectBookingDatesCalendarView>

                        <View>
                            <Text>Nights: €{Number(parsedAccommodation.Rent * amountOfNights).toFixed(2)}</Text>
                            <Text>Cleaning fee: €{parsedAccommodation.CleaningFee.toFixed(2)}</Text>
                            <Text>Service fee: €{parsedAccommodation.ServiceFee.toFixed(2)}</Text>
                            <Text>Total cost: {totalCost.toFixed(2)}</Text>
                        </View>

                        <View style={styles.bookingButtonContainer}>
                            <View style={styles.bookingButton}>
                                <TouchableOpacity onPress={handleOnBookPress} style={styles.bookingButtonContent}>
                                    <Text style={styles.bookingButtonText}><TranslatedText
                                        textToTranslate={"book"}/></Text>
                                    <Ionicons name={'arrow-forward-circle-outline'} size={24}
                                              style={styles.bookingButtonIcon}/>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.categoryDivider}/>

                        <Text style={styles.categoryTitle}><TranslatedText textToTranslate={"amenities"}/></Text>
                        <View style={styles.amenities}>{RenderAmenities(parsedAccommodation)}</View>
                        <View>
                            <TouchableOpacity
                                onPress={toggleAmenitiesModal}
                                style={styles.ShowAllAmenitiesButton}>
                                <Text style={styles.ShowAllAmenitiesButtonText}><TranslatedText
                                    textToTranslate={"show all amenities"}/></Text>
                            </TouchableOpacity>
                            {showAmenitiesModal && (
                                <AmenitiesPopup
                                    features={parsedAccommodation.Features}
                                    onClose={toggleAmenitiesModal}
                                />
                            )}
                        </View>

                        <View style={styles.categoryDivider}/>

                        <HostSectionView
                            ownerId={parsedAccommodation.OwnerId}
                            navigation={navigation}
                        />

                        <View style={styles.categoryDivider}/>

                    </View>
                </ScrollView>
            </View>
        </SafeAreaView>
    );
};

export default PropertyDetailsScreen;
