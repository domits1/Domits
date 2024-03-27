import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import HomeScreen from '../screens/homeScreen';
import Messages from '../screens/messages';
import AccountPage from '../screens/account';
import GuestDashboard from '../screens/guestdashboard/guestDashboard';
// import Header from '../header/header';
import Scan from '../header/scan';
import Pay from '../header/pay';
import Bookings from '../header/bookings';
import Pocket from '../header/pocket';
import {View, Text} from 'react-native';
import profile from '../screens/guestdashboard/profile';
import paymentMethods from '../screens/guestdashboard/paymentMethods';
import reviews from '../screens/guestdashboard/reviews';
import settings from '../screens/guestdashboard/settings';
import helpAndFeedback from '../screens/guestdashboard/helpAndFeedback';
import HostHomepage from '../screens/hostdashboard/hostDashboard';
import HostDashboard from '../screens/hostdashboard/dashboard';
import HostProfile from '../screens/hostdashboard/profile';
import HostPayments from '../screens/hostdashboard/payments';
import HostListings from '../screens/hostdashboard/listings';
import HostSettings from '../screens/hostdashboard/settings';
import HostRevenue from '../screens/hostonboarding/revenueTool';
import Detailpage from '../screens/detailpage';
import onBoarding1 from '../screens/bookingprocess/bookingProcess';
import personalDetailsForm from '../screens/bookingprocess/personalDetailsForm';
import finalBookingOverview from '../screens/bookingprocess/finalBookingOverview';
import simulateStripe from '../screens/bookingprocess/simulateStripe';
import paymentAccepted from '../screens/bookingprocess/paymentAccepted';
import paymentDeclined from '../screens/bookingprocess/paymentDeclined';
import bookedAccommodation from '../screens/bookingprocess/bookedAccommodation';
import ListProperty from '../screens/hostonboarding/listProperty';
import LocationFillIn from '../screens/hostonboarding/LocationFillIn';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="GuestDashboard" component={GuestDashboard} />
      <Stack.Screen name="Scan" component={Scan} />
      <Stack.Screen name="Pay" component={Pay} />
      <Stack.Screen name="Bookings" component={Bookings} />
      <Stack.Screen name="Pocket" component={Pocket} />
      <Stack.Screen name="Detailpage" component={Detailpage} />
      <Stack.Screen name="onBoarding1" component={onBoarding1} />
      <Stack.Screen
        name="personalDetailsForm"
        component={personalDetailsForm}
      />
      <Stack.Screen
        name="finalBookingOverview"
        component={finalBookingOverview}
      />
      <Stack.Screen name="simulateStripe" component={simulateStripe} />
      <Stack.Screen name="paymentAccepted" component={paymentAccepted} />
      <Stack.Screen name="paymentDeclined" component={paymentDeclined} />
      <Stack.Screen
        name="bookedAccommodation"
        component={bookedAccommodation}
      />

      <Stack.Screen name="Profile" component={profile} />
      <Stack.Screen name="PaymentMethods" component={paymentMethods} />
      <Stack.Screen name="Reviews" component={reviews} />
      <Stack.Screen name="Settings" component={settings} />
      <Stack.Screen name="HelpAndFeedback" component={helpAndFeedback} />
      <Stack.Screen name="HostHomepage" component={HostHomepage} />
      <Stack.Screen name="HostDashboard" component={HostDashboard} />
      <Stack.Screen name="HostProfile" component={HostProfile} />
      <Stack.Screen name="HostPayments" component={HostPayments} />
      <Stack.Screen name="HostListings" component={HostListings} />
      <Stack.Screen name="HostSettings" component={HostSettings} />
      <Stack.Screen name="HostRevenue" component={HostRevenue} />
      <Stack.Screen name="ListProperty" component={ListProperty} />
      <Stack.Screen name="LocationFillIn" component={LocationFillIn} />
    </Stack.Navigator>
  );
}

function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#f0f0f0',
          borderTopColor: 'transparent',
          height: 60,
          paddingBottom: 10,
        },
        tabBarIcon: ({focused, color, size}) => {
          let iconName;
          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Messages':
              iconName = 'message';
              break;
            case 'Account':
              iconName = 'account-circle';
              break;
            default:
              iconName = 'circle';
          }

          return (
            <View style={{alignItems: 'center', justifyContent: 'center'}}>
              <MaterialIcons
                name={iconName}
                size={30}
                color={focused ? '#007AFF' : '#8e8e93'}
              />
              <Text
                style={{color: focused ? '#007AFF' : '#8e8e93', fontSize: 12}}>
                {route.name}
              </Text>
            </View>
          );
        },
      })}>
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{headerShown: false}}
      />
      <Tab.Screen name="Messages" component={Messages} />
      <Tab.Screen name="Account" component={AccountPage} />
    </Tab.Navigator>
  );
}

export default BottomTabNavigator;
