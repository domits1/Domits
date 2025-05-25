import {ToastAndroid, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import LoadingScreen from '../../../loadingscreen/screens/LoadingScreen';
import {styles} from '../styles/singleBooking';
import TabHeader from '../../../accounthome/components/TabHeader';
import TestPropertyRepository from '../../../../services/property/test/testPropertyRepository';
import PropertyRepository from '../../../../services/property/propertyRepository';
import ToastMessage from '../../../../components/ToastMessage';
import PropertyView from '../views/PropertyView';
import {useStripe} from '@stripe/stripe-react-native';
import Spacer from '../../../../components/Spacer';
import ConfirmAndPayButton from '../../../../features/bookingengine/stripe/components/ConfirmAndPayButton';
import BookingRepository from '../../../../services/availability/bookingRepository';
import {HOME_SCREEN} from "../../../../navigation/utils/NavigationNameConstants";
import TranslatedText from "../../../../features/translation/components/TranslatedText";

const GuestSingleBooking = ({navigation, route}) => {
  const booking = route.params.booking;

  const propertyRepository =
    process.env.REACT_APP_TESTING === 'true'
      ? new TestPropertyRepository()
      : new PropertyRepository();

  const bookingRepository =
    process.env.REACT_APP_TESTING === 'true'
      ? new TestPropertyRepository()
      : new BookingRepository();

  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState(null);

  const fetchPropertyByBookingId = async () => {
    if (booking.status.S === 'Paid') {
      setProperty(
        await propertyRepository.fetchPropertyByBookingId(booking.id.S),
      );
    } else {
      setProperty(
        await propertyRepository.fetchPropertyDetails(booking.property_id.S),
      );
    }
  };

  useEffect(() => {
    async function executeAsyncFunction() {
      try {
        await fetchPropertyByBookingId();
      } catch (error) {
        ToastMessage(error.message, ToastAndroid.SHORT);
      } finally {
        setLoading(false);
      }
    }

    executeAsyncFunction();
  }, []);

  const {initPaymentSheet, presentPaymentSheet} = useStripe();
  const openPaymentSheet = async () => {
    setLoading(true);
    try {
      const paymentSecret = await bookingRepository.getPaymentByBookingId(
        booking.id.S,
      );
      setLoading(false);
      const {error} = await initPaymentSheet({
        paymentIntentClientSecret: paymentSecret,
        merchantDisplayName: 'Domits',
      });

      if (error) {
        ToastMessage("Unable to register payment, please contact support.", ToastAndroid.SHORT);
      } else {
        const {error} = await presentPaymentSheet();
        if (error) {
          ToastMessage("Unable to complete payment, please contact support.", ToastAndroid.SHORT);
        } else {
          setLoading(true);
          const payment = await bookingRepository.confirmBooking(booking.id.S);
          setLoading(false);
          if (payment) {
            ToastMessage("Payment completed, thank you for your cooperation.", ToastAndroid.SHORT);
            navigation.navigate(HOME_SCREEN)
          } else {
            ToastMessage("Unable to complete payment, please contact support.", ToastAndroid.SHORT);
          }
        }
      }
    } catch (error) {
      if (loading) {
        setLoading(false);
      }
      ToastMessage(error.message, ToastAndroid.SHORT);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!property) {
    return (
      <View style={styles.container}>
        <TabHeader tabTitle={"Something went wrong."} />
        <TranslatedText textToTranslate={"Failed to fetch property matching your booking."} />
      </View>
    );
  }

  return (
    <View>
      <TabHeader tabTitle={property.property.title} />
      <View style={styles.container}>
        <PropertyView property={property} booking={booking} />
        <Spacer />
        {booking.status.S !== 'Paid' && (
          <ConfirmAndPayButton
            onPress={() => openPaymentSheet()}
            text={'Pay'}
          />
        )}
      </View>
    </View>
  );
};

export default GuestSingleBooking;
