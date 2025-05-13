import {Image, View} from 'react-native';
import React, {useEffect, useState} from 'react';
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

const StripePayment = ({navigation, route}) => {
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

  useEffect(() => {
    setNights(calculateNumberOfNights(arrivalDate, departureDate));
  }, [arrivalDate, departureDate]);

  useEffect(() => {
    setPaymentSecret('');
    // Create booking (Should return a paymentIntent, ephemeralKey and customerId (Stripe id)
    // See https://docs.stripe.com/payments/accept-a-payment?platform=react-native#setup-server-side
    setBookingId('6a75f247-29c9-11f0-a98e-c8d9d22fb751');
  });

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
        booking: bookingId,
      });
    } else {
      const {error} = await presentPaymentSheet();
      if (error) {
        navigation.navigate(STRIPE_PAYMENT_CANCELLED_SCREEN, {
          property: property,
          guests: guests,
          nights: nights,
          paymentSecret: paymentSecret,
          booking: bookingId,
        });
      } else {
        navigation.navigate(STRIPE_PAYMENT_CONFIRMED_SCREEN, {
          booking: bookingId,
          guests: guests,
          nights: nights,
        });
      }
    }
  };

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
        <ConfirmAndPayButton onPress={() => openPaymentSheet()} />
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
