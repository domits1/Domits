import React, {useCallback, useEffect, useState} from 'react';
import {ScrollView, ToastAndroid, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {styles} from '../styles/propertyDetailsStyles';
import CalculateNumberOfNights from '../../../features/bookingengine/stripe/utils/CalculateNumberOfNights';
import ImagesView from '../views/imagesView';
import LoadingScreen from '../../loadingscreen/screens/LoadingScreen';
import PropertyMainDetailsView from '../views/PropertyMainDetailsView';
import {
  HOME_SCREEN,
  STRIPE_PROCESS_SCREEN,
} from '../../../navigation/utils/NavigationNameConstants';
import PropertyRepository from '../../../services/property/propertyRepository';
import TestPropertyRepository from '../../../services/property/test/testPropertyRepository';
import CalendarComponent from '../../../features/calendar/CalendarComponent';
import Header from '../components/header';
import PricingView from '../views/pricingView';
import BookingView from '../views/bookingView';
import AmenitiesView from '../views/amenitiesView';
import ToastMessage from '../../../components/ToastMessage';
import TranslatedText from "../../../features/translation/components/TranslatedText";

const PropertyDetailsScreen = ({route, navigation}) => {
  const [property, setProperty] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAmenitiesModal, setShowAmenitiesModal] = useState(false);
  const [firstSelectedDate, setFirstSelectedDate] = useState(null);
  const [lastSelectedDate, setLastSelectedDate] = useState(null);

  const propertyRepository =
    process.env.REACT_APP_TESTING === 'true'
      ? new TestPropertyRepository()
      : new PropertyRepository();

  const fetchPropertyDetails = useCallback(async () => {
    try {
      const property = await propertyRepository.fetchPropertyDetails(
        route.params.property.property.id,
      );
      if (property.property) {
        setProperty(property);
      }
    } catch (error) {
      ToastMessage(error.message, ToastAndroid.SHORT);
    }
  });

  useEffect(() => {
    fetchPropertyDetails().then(() => setLoading(false));
  }, []);

  const nights = CalculateNumberOfNights(firstSelectedDate, lastSelectedDate);

  const handleOnBookPress = () => {
    if (!firstSelectedDate || !lastSelectedDate) {
      ToastMessage('Please select a start and end date', ToastAndroid.SHORT);
    } else {
      navigation.navigate(STRIPE_PROCESS_SCREEN, {
        arrivalDate: firstSelectedDate,
        departureDate: lastSelectedDate,
        property: property,
      });
    }
  };

  const toggleAmenitiesModal = () => {
    setShowAmenitiesModal(!showAmenitiesModal);
  };

  if (loading) {
    return <LoadingScreen loadingName={'property'} />;
  }

  if (!property) {
    return (
      <SafeAreaView style={{flex: 1}}>
        <View style={styles.container}>
          <Header
            property={property}
            handleHomeScreenPress={() => navigation.navigate(HOME_SCREEN)}
          />
          <TranslatedText textToTranslate={"Property information unavailable."} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{flex: 1}}>
      <View style={styles.container}>
        <Header
          property={property}
          handleHomeScreenPress={() => navigation.navigate(HOME_SCREEN)}
        />
        <ScrollView style={styles.contentContainer}>
          <ImagesView images={property.images} />
          <View style={styles.propertyDetailsContainer}>
            <PropertyMainDetailsView property={property} />
            <CalendarComponent
              onFirstDateSelected={date => setFirstSelectedDate(date)}
              onLastDateSelected={date => setLastSelectedDate(date)}
              property={property}
              clickEnabled={true}
            />
            <View style={styles.bookingContainer}>
              <PricingView property={property} nights={nights} />
              <BookingView handleOnBookPress={handleOnBookPress} />
            </View>
            <View style={styles.categoryDivider} />

            <AmenitiesView
              property={property}
              toggleAmenitiesModal={toggleAmenitiesModal}
              showAmenitiesModal={showAmenitiesModal}
            />
            <View style={styles.categoryDivider} />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default PropertyDetailsScreen;
