import React, {useCallback, useEffect, useState} from 'react';
import {
    ScrollView,
    Text,
    ToastAndroid,
    TouchableOpacity,
    View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {styles} from '../styles/propertyDetailsStyles';
import AmenitiesPopup from '../components/AmenitiesPopup';
import SelectBookingDatesCalendarView from '../views/SelectBookingDatesCalendarView';
import TranslatedText from '../../../features/translation/components/TranslatedText';
import CalculateNumberOfNights from '../../../features/bookingengine/utils/CalculateNumberOfNights';
import RenderAmenities from '../hooks/RenderAmenities';
import PropertyImagesView from '../views/PropertyImagesView';
import LoadingScreen from '../../loadingscreen/screens/LoadingScreen';
import PropertyMainDetailsView from '../views/PropertyMainDetailsView';
import {
    BOOKING_PROCESS_SCREEN,
    HOME_SCREEN,
} from '../../../navigation/utils/NavigationNameConstants';
import FetchPropertyDetails from '../../../services/FetchPropertyDetails';

const PropertyDetailsScreen = ({route, navigation}) => {
    const [property, setProperty] = useState({});
    const [loading, setLoading] = useState(true);
    const [showAmenitiesModal, setShowAmenitiesModal] = useState(false);
    const [firstSelectedDate, setFirstSelectedDate] = useState(null);
    const [lastSelectedDate, setLastSelectedDate] = useState(null);

    /**
     * Fetch current accommodation data.
     */
    const fetchPropertyDetails = useCallback(async () => {
        const property = await FetchPropertyDetails(route.params.property.property.id);
        if (property.property) {
            setProperty(property);
        }
    })

    useEffect(() => {
        fetchPropertyDetails().then(() => setLoading(false));
    }, []);

    const nights = CalculateNumberOfNights(firstSelectedDate, lastSelectedDate);

    const handleHomeScreenPress = () => {
        navigation.navigate(HOME_SCREEN);
    };

    const handleOnBookPress = () => {
        if (!firstSelectedDate || !lastSelectedDate) {
            ToastAndroid.show(
                'Please select a start and end date',
                ToastAndroid.SHORT,
            );
        } else {
            navigation.navigate(BOOKING_PROCESS_SCREEN, {
                firstSelectedDate,
                lastSelectedDate,
                property: property.property.id,
            });
        }
    };

    const toggleAmenitiesModal = () => {
        setShowAmenitiesModal(!showAmenitiesModal);
    };

    if (loading) {
        return <LoadingScreen loadingName={'property'}/>;
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
                    <Text style={styles.titleText}>{property.property.title}</Text>
                </View>

                <ScrollView style={styles.contentContainer}>
                    <PropertyImagesView images={property.images}/>

                    <View style={styles.propertyDetailsContainer}>
                        <PropertyMainDetailsView property={property}/>

                        <SelectBookingDatesCalendarView
                            onFirstDateSelected={date => setFirstSelectedDate(date)}
                            onLastDateSelected={date => setLastSelectedDate(date)}
                            property={property}
                        />
                        <View style={styles.bookingContainer}>
                            <View>
                                <Text>
                                    Nights: €
                                    {Number(property.pricing.roomRate * nights).toFixed(2)}
                                </Text>
                                <Text>
                                    Cleaning fee: €{property.pricing.cleaning.toFixed(2)}
                                </Text>
                                <Text>
                                    Service fee: €{property.pricing.service.toFixed(2)}
                                </Text>
                                <Text>Total cost: {(
                                    property.pricing.roomRate * nights +
                                    property.pricing.cleaning +
                                    property.pricing.service
                                ).toFixed(2)}</Text>
                            </View>

                            <View style={styles.bookingButtonContainer}>
                                <View style={styles.bookingButton}>
                                    <TouchableOpacity
                                        onPress={handleOnBookPress}
                                        style={styles.bookingButtonContent}>
                                        <Text style={styles.bookingButtonText}>
                                            <TranslatedText textToTranslate={'Book'}/>
                                        </Text>
                                        <Ionicons
                                            name={'arrow-forward-circle-outline'}
                                            size={24}
                                            style={styles.bookingButtonIcon}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        <View style={styles.categoryDivider}/>

                        <Text style={styles.categoryTitle}>
                            <TranslatedText textToTranslate={'Amenities'}/>
                        </Text>
                        <View style={styles.amenities}>
                            <RenderAmenities propertyAmenities={property.amenities}/>
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
                        <View style={styles.categoryDivider}/>
                    </View>
                </ScrollView>
            </View>
        </SafeAreaView>
    );
};

export default PropertyDetailsScreen;
