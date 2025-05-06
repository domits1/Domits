import React, {useEffect, useState} from 'react';
import {
  Image,
  ScrollView,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {styles} from '../styles/BookingEngineStyles';
import BookingEngineGuestsPopup from '../components/BookingEngineGuestsPopup';
import CalculateNumberOfNights from '../utils/CalculateNumberOfNights';
import {SIMULATE_STRIPE_SCREEN, STRIPE_PROCESS_SCREEN} from '../../../../navigation/utils/NavigationNameConstants';
import {S3URL} from '../../../../store/constants';
import ToastMessage from '../../../../components/ToastMessage';
import Header from '../components/Header';
import TitleView from '../views/TitleView';
import CalendarView from '../views/CalendarView';
import PricingView from '../views/PricingView';

const BookingEngineScreen = ({navigation, route}) => {
  const [firstSelectedDate, setFirstSelectedDate] = useState(
    route.params.firstSelectedDate,
  );
  const [lastSelectedDate, setLastSelectedDate] = useState(
    route.params.lastSelectedDate,
  );
  const property = route.params.property;
  const propertyImages = property.images;
  const [showDatePopUp, setShowDatePopUp] = useState(false);
  const [showGuestAmountPopUp, setShowGuestAmountPopUp] = useState(false);
  const [adults, setAdults] = useState(1);
  const [kids, setKids] = useState(0);
  const [nights, setNights] = useState(0);

  useEffect(() => {
    setNights(CalculateNumberOfNights(firstSelectedDate, lastSelectedDate));
  }, [firstSelectedDate, lastSelectedDate]);

  /**
   * Confirms both the firstSelectedDate and lastSelectedDate
   * are set.
   * @Shows a toast message if this is not the case.
   * @Navigates if both dates are set.
   */
  const handleBookButton = () => {
    if (!firstSelectedDate || !lastSelectedDate) {
      ToastMessage('Please select a start and end date', ToastAndroid.SHORT);
    } else {
      navigation.navigate(STRIPE_PROCESS_SCREEN);
    }
  };

  return (
    <SafeAreaView style={{flex: 1}}>
      <ScrollView>
        <Header navigation={navigation} />
        <Image
          source={{uri: `${S3URL}${propertyImages[0].key}`}}
          style={styles.image}
        />
        <View style={styles.detailsContainer}>
          <TitleView property={property} />
          <View style={styles.separator} />
          <CalendarView
            showDatePopUp={showDatePopUp}
            setShowDatePopUp={setShowDatePopUp}
            firstSelectedDate={firstSelectedDate}
            lastSelectedDate={lastSelectedDate}
            setFirstSelectedDate={setFirstSelectedDate}
            setLastSelectedDate={setLastSelectedDate}
            property={property}
          />
          <View style={styles.separator} />
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Guests</Text>
            <Text style={styles.sectionContent}>
              {adults} adults - {kids} kids
            </Text>
            <TouchableOpacity
              onPress={() => setShowGuestAmountPopUp(!showGuestAmountPopUp)}>
              <Text style={styles.linkText}>Change</Text>
            </TouchableOpacity>
          </View>
          {showGuestAmountPopUp && (
            <BookingEngineGuestsPopup
              onClose={() => setShowGuestAmountPopUp(!showGuestAmountPopUp)}
              maxGuests={
                property.generalDetails.find(
                  detail => detail.detail === 'Guests',
                ).value
              }
              currentAdults={adults}
              currentKids={kids}
              setAdults={setAdults}
              setKids={setKids}
            />
          )}
          <View style={styles.separator} />
          <PricingView
            kids={kids}
            adults={adults}
            nights={nights}
            property={property}
          />
        </View>
        <TouchableOpacity onPress={handleBookButton} style={styles.bookButton}>
          <Text style={styles.bookButtonText}>Confirm & Pay</Text>
        </TouchableOpacity>
        <Text style={styles.stripeText}>
          Secure payment gateway powered by Stripe.com
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

export default BookingEngineScreen;
