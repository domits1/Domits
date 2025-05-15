import {Image, ToastAndroid, View} from 'react-native';
import React, {useCallback, useEffect, useState} from 'react';
import Header from '../components/Header';
import {S3URL} from '../../../../store/constants';
import {styles} from '../styles/styles';
import Spacer from '../../../../components/Spacer';
import LocationView from '../views/LocationView';
import BookingDatesView from '../views/BookingDatesView';
import CalendarModal from '../components/CalendarModal';
import BookingGuestsView from '../views/BookingGuestsView';
import GuestsModal from '../components/GuestsModal';
import LineDivider from '../../../../components/LineDivider';
import calculateNumberOfNights from '../utils/CalculateNumberOfNights';
import PricingView from '../../global/views/PricingView';
import ConfirmAndPayButton from '../components/ConfirmAndPayButton';
import {useStripe} from '@stripe/stripe-react-native';
import {
  STRIPE_PAYMENT_CANCELLED_SCREEN,
  STRIPE_PAYMENT_CONFIRMED_SCREEN,
} from '../../../../navigation/utils/NavigationNameConstants';
import BookingRepository from '../../../../services/availability/bookingRepository';
import TestBookingRepository from '../../../../services/availability/test/testBookingRepository';
import ToastMessage from '../../../../components/ToastMessage';
import LoadingScreen from '../../../../screens/loadingscreen/screens/LoadingScreen';

const StripePayment = ({navigation, route}) => {
  const [loading, setLoading] = useState(false);

  const property = route.params.property;

  const [arrivalDate, setArrivalDate] = useState(route.params.arrivalDate);
  const [departureDate, setDepartureDate] = useState(
    route.params.departureDate,
  );
  const [showDatePopUp, setShowDatePopUp] = useState(false);

  const [nights, setNights] = useState(
    calculateNumberOfNights(arrivalDate, departureDate),
  );

  const [guests, setGuests] = useState(1);
  const [showGuestsPopUp, setShowGuestsPopUp] = useState(false);

  const [bookingId, setBookingId] = useState(null);
  const [paymentSecret, setPaymentSecret] = useState(null);

  const repository =
    process.env.REACT_APP_TESTING === 'true'
      ? new TestBookingRepository()
      : new BookingRepository();

  useEffect(() => {
    setNights(calculateNumberOfNights(arrivalDate, departureDate));
  }, [arrivalDate, departureDate]);

  const createPayment = useCallback(async () => {
    try {
      setLoading(true);
      const {stripeClientSecret, bookingId} = await repository.createBooking(
          property.property.id,
          guests,
          arrivalDate,
          departureDate,
      );
      await setPaymentSecret(stripeClientSecret);
      await setBookingId(bookingId);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.log(error);
      ToastMessage('Something went wrong, please try again later.', ToastAndroid.SHORT);
    }
  });

  useEffect(() => {
    if (paymentSecret && bookingId) {
      openPaymentSheet();
    }
  }, [paymentSecret, bookingId]);

  const {initPaymentSheet, presentPaymentSheet} = useStripe();
  const openPaymentSheet = async () => {
    const {error} = await initPaymentSheet({
      paymentIntentClientSecret: paymentSecret,
      merchantDisplayName: 'Domits',
    });

    if (error) {
      navigation.navigate(STRIPE_PAYMENT_CANCELLED_SCREEN, {
        property: property,
        guests: guests,
        nights: nights,
        paymentSecret: paymentSecret,
        bookingId: bookingId,
      });
    } else {
      const {error} = await presentPaymentSheet();
      if (error) {
        navigation.navigate(STRIPE_PAYMENT_CANCELLED_SCREEN, {
          property: property,
          guests: guests,
          nights: nights,
          paymentSecret: paymentSecret,
          bookingId: bookingId,
        });
      } else {
        navigation.navigate(STRIPE_PAYMENT_CONFIRMED_SCREEN, {
          bookingId: bookingId,
          guests: guests,
          nights: nights,
        });
      }
    }
  };

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <>
      <View style={styles.container}>
        <Header navigation={navigation} />
        <Image
          source={{uri: `${S3URL}${property.images[0].key}`}}
          style={styles.image}
        />
        <Spacer />
        <LocationView property={property} />
        <Spacer />
        <BookingDatesView
          arrivalDate={arrivalDate}
          departureDate={departureDate}
          onChangePress={() => setShowDatePopUp(true)}
        />
        <Spacer />
        <BookingGuestsView
          guests={guests}
          onChangePress={() => setShowGuestsPopUp(true)}
        />
        <LineDivider />
        <PricingView
          guests={guests}
          nights={nights}
          pricing={property.pricing}
        />
        <Spacer />
        <ConfirmAndPayButton onPress={() => createPayment()} />
      </View>
      {showDatePopUp && (
        <CalendarModal
          showDatePopUp={showDatePopUp}
          setShowDatePopUp={setShowDatePopUp}
          property={property}
          setFirstSelectedDate={setArrivalDate}
          firstSelectedDate={arrivalDate}
          setLastSelectedDate={setDepartureDate}
          lastSelectedDate={departureDate}
        />
      )}
      {showGuestsPopUp && (
        <GuestsModal
          onClose={() => setShowGuestsPopUp(false)}
          maxGuests={
            property.generalDetails.find(detail => detail.detail === 'Guests')
              .value
          }
          guests={guests}
          setGuests={setGuests}
        />
      )}
    </>
  );
};

export default StripePayment;
