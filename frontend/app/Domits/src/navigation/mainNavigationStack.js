import {createNativeStackNavigator} from '@react-navigation/native-stack';
import React from 'react';
import Scan from '../header/scan';
import Pay from '../header/pay';
import GuestBookings from '../screens/guestdashboard/guestBookingsOverview/screens/GuestBookings';
import Pocket from '../header/pocket';
import PropertyDetails from '../screens/propertyDetailsScreen/screens/propertyDetailsScreen';
import HostProfile from '../screens/profile/hostprofile/HostProfileTab';
import StripePayment from '../features/bookingengine/stripe/screens/StripePayment';
import PaymentCancelled from '../features/bookingengine/paymentcancelled/screens/PaymentCancelled';
import PaymentConfirmed from '../features/bookingengine/paymentconfirmed/screens/PaymentConfirmed';
import HomeScreen from '../screens/home/screens/Home';
import {
  GUEST_BOOKINGS_SCREEN,
  GUEST_SINGLE_BOOKING_SCREEN,
  HOME_SCREEN,
  HOST_PROFILE_SCREEN,
  PAY_SCREEN,
  POCKET_SCREEN,
  PROPERTY_DETAILS_SCREEN,
  SCAN_SCREEN,
  STRIPE_PAYMENT_CANCELLED_SCREEN,
  STRIPE_PAYMENT_CONFIRMED_SCREEN,
  STRIPE_PROCESS_SCREEN,
} from './utils/NavigationNameConstants';
import GuestSingleBooking from '../screens/guestdashboard/guestSingleBookingOverview/screens/GuestSingleBooking';

const Stack = createNativeStackNavigator();

function MainNavigationStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {backgroundColor: '#FFFFFF'},
      }}>
      {/* General */}
      <Stack.Screen name={HOME_SCREEN} component={HomeScreen} />

      {/* Features */}
      <Stack.Screen name={SCAN_SCREEN} component={Scan} />
      <Stack.Screen name={PAY_SCREEN} component={Pay} />
      <Stack.Screen name={POCKET_SCREEN} component={Pocket} />

      {/* Host */}
      <Stack.Screen name={HOST_PROFILE_SCREEN} component={HostProfile} />

      {/* Guest */}
      <Stack.Screen name={GUEST_BOOKINGS_SCREEN} component={GuestBookings} />
      <Stack.Screen name={GUEST_SINGLE_BOOKING_SCREEN} component={GuestSingleBooking} />

      {/* Property */}
      <Stack.Screen name={PROPERTY_DETAILS_SCREEN} component={PropertyDetails} />

      {/* Booking Engine */}
      <Stack.Screen name={STRIPE_PROCESS_SCREEN} component={StripePayment} />
      <Stack.Screen name={STRIPE_PAYMENT_CANCELLED_SCREEN} component={PaymentCancelled} />
      <Stack.Screen name={STRIPE_PAYMENT_CONFIRMED_SCREEN} component={PaymentConfirmed} />
    </Stack.Navigator>
  );
}

export default MainNavigationStack;
