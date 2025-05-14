import {ToastAndroid, View} from 'react-native';
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
import {HOME_SCREEN} from "../../../../navigation/utils/NavigationNameConstants";

const PaymentConfirmed = ({navigation, route}) => {
  const booking = route.params.booking;
  const guests = route.params.guests;
  const nights = route.params.nights;

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);

  const {userAttributes} = useAuth();

  const propertyRepository =
    process.env.REACT_APP_TESTING === 'true'
      ? new TestPropertyRepository()
      : new PropertyRepository();

  const fetchPropertyDetails = useCallback(async () => {
    try {
      const property = await propertyRepository.fetchPropertyByBookingId(
        booking,
      );
      if (property.property) {
        setProperty(property);
      } else {
        ToastMessage(
          'Something went wrong while fetching the property data.',
          ToastAndroid.SHORT,
        );
      }
    } catch (error) {
      ToastMessage(error.message, ToastAndroid.SHORT);
    }
  }, []);

  useEffect(() => {
    // Await Confirmation
    fetchPropertyDetails().then(() => {
      setLoading(false);
    });
  });

  if (loading) {
    return <LoadingScreen />;
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
            navigation.navigate(HOME_SCREEN);
          }}
        />
      </View>
    );
  }
};

export default PaymentConfirmed;
