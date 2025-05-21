import {Alert, ToastAndroid, View} from 'react-native';
import {styles} from '../styles/styles';
import Spacer from '../../../../components/Spacer';
import ConfirmedView from '../views/ConfirmedView';
import {useAuth} from '../../../../context/AuthContext';
import PricingView from '../../global/views/PricingView';
import {useCallback, useEffect, useState} from 'react';
import LoadingScreen from '../../../../screens/loadingscreen/screens/LoadingScreen';
import TestPropertyRepository from '../../../../services/property/test/testPropertyRepository';
import PropertyRepository from '../../../../services/property/propertyRepository';
import ToastMessage from '../../../../components/ToastMessage';
import LocationView from '../views/LocationView';
import ViewBookingButton from '../components/ViewBookingButton';
import {GUEST_BOOKINGS_SCREEN} from '../../../../navigation/utils/NavigationNameConstants';
import TestBookingRepository from '../../../../services/availability/test/testBookingRepository';
import BookingRepository from '../../../../services/availability/bookingRepository';

const PaymentConfirmed = ({navigation, route}) => {
  const bookingId = route.params.bookingId;
  const guests = route.params.guests;
  const nights = route.params.nights;

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);

  const {userAttributes} = useAuth();

  const propertyRepository =
    process.env.REACT_APP_TESTING === 'true'
      ? new TestPropertyRepository()
      : new PropertyRepository();

  const bookingRepository =
    process.env.REACT_APP_TESTING === 'true'
      ? new TestBookingRepository()
      : new BookingRepository();

  const confirmBooking = useCallback(async () => {
    const {paymentConfirmed} = await bookingRepository.confirmBooking(
      bookingId,
    );
    if (!paymentConfirmed) {
      throw new Error('Payment was not confirmed, please contact support.');
    }
  });

  const fetchPropertyDetails = useCallback(async () => {
    const property = await propertyRepository.fetchPropertyByBookingId(
      bookingId,
    );
    if (property.property) {
      setProperty(property);
    } else {
      throw new Error('Something went wrong while fetching the property data.');
    }
  }, []);

  useEffect(() => {
    async function executeAsyncUseEffect() {
      try {
        await confirmBooking();
        await fetchPropertyDetails();
      } catch (error) {
        ToastMessage(error.message, ToastAndroid.SHORT);
      } finally {
        setLoading(false);
      }
    }

    executeAsyncUseEffect();
  });

  if (loading) {
    return <LoadingScreen />;
  } else if (!property) {
    Alert.alert(
      'Failed to fetch property details',
      'Something went wrong while attempting to fetch the booking property details. Please contact support.',
    );
  } else {
    return (
      <View style={styles.container}>
        <View style={{flex: 1}}>
          <Spacer />
          <ConfirmedView userAttributes={userAttributes} />
          <Spacer />
          <PricingView
            pricing={property.pricing}
            nights={nights}
            guests={guests}
          />
          <Spacer />
          <LocationView
            location={property.location}
            description={property.property.description}
          />
        </View>
        <ViewBookingButton
          onPress={() => {
            console.error('View booking');
            navigation.navigate(GUEST_BOOKINGS_SCREEN);
          }}
        />
      </View>
    );
  }
};
export default PaymentConfirmed;
