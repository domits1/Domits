import {Alert, View} from 'react-native';
import {styles} from '../styles/styles';
import Spacer from '../../../../components/Spacer';
import CancelledView from '../views/CancelledView';
import PricingView from '../../global/views/PricingView';
import TryAgainButton from '../components/TryAgainButton';
import {useStripe} from '@stripe/stripe-react-native';
import {HOME_SCREEN, STRIPE_PAYMENT_CONFIRMED_SCREEN} from '../../../../navigation/utils/NavigationNameConstants';

const PaymentCancelled = ({navigation, route}) => {
  const property = route.params.property;
  const guests = route.params.guests
  const nights = route.params.nights;
  const paymentSecret = route.params.paymentSecret;
  const booking = route.params.booking;

  const {initPaymentSheet, presentPaymentSheet} = useStripe();
  const openPaymentSheet = async () => {
    try {
      const {error} = await initPaymentSheet({
        paymentIntentClientSecret: paymentSecret,
        merchantDisplayName: 'Domits',
      });

      if (error) {
        Alert.alert('Something went wrong', 'Please contact support');
        navigation.navigate(HOME_SCREEN);
      } else {
        const {error} = await presentPaymentSheet();
        if (error) {
          Alert.alert('Something went wrong', 'Please contact support');
          navigation.navigate(HOME_SCREEN);
        } else {
          navigation.navigate(STRIPE_PAYMENT_CONFIRMED_SCREEN, {
            booking: booking,
            guests: guests,
            nights: nights,
          });
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={{flex: 1}}>
        <Spacer />
        <CancelledView
          onPress={() => {
            // TODO Add cancel booking method.
            console.error(`Cancelled payment: ${paymentSecret}`);
            navigation.navigate(HOME_SCREEN);
          }}
        />
        <Spacer />
        <PricingView
          guests={guests}
          nights={nights}
          pricing={property.pricing}
        />
      </View>
      <TryAgainButton onPress={() => openPaymentSheet()} />
    </View>
  );
};

export default PaymentCancelled;
