import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import HomeScreen from '../components/homeScreen';
import Messages from '../screens/messages';
import AccountPage from '../screens/account';
import GuestDashboard from '../screens/guestdashboard/guestDashboard';
import Scan from '../header/scan';
import Pay from '../header/pay';
import Bookings from '../header/bookings';
import Pocket from '../header/pocket';
import {View, Text} from 'react-native';
import GuestProfileTab from '../screens/guestdashboard/GuestProfileTab';
import GuestPaymentsTab from '../screens/guestdashboard/GuestPaymentsTab';
import GuestReviewsTab from '../screens/guestdashboard/GuestReviewsTab';
import GuestSettingsTab from '../screens/guestdashboard/GuestSettingsTab';
import GuestHelpAndFeedbackTab from '../screens/guestdashboard/GuestHelpAndFeedbackTab';
import HostHomepage from '../screens/hostdashboard/HostDashboard';
import HostDashboardTab from '../screens/hostdashboard/HostDashboardTab';
import HostCalendarTab from '../screens/hostdashboard/HostCalendarTab';
import HostReviewsTab from '../screens/hostdashboard/HostReviewsTab';
import HostProfileTab from '../screens/hostdashboard/HostProfileTab';
import HostPaymentsTab from '../screens/hostdashboard/HostPaymentsTab';
import HostListingsTab from '../screens/hostdashboard/HostListingsTab';
import OnboardingHost from '../screens/hostOnboarding/OnboardingHost';
import HostSettingsTab from '../screens/hostdashboard/HostSettingsTab';
import Landing from '../screens/Landing';
import emailSettings from '../screens/hostdashboard/emailSettings';
import HostHelpDesk from '../screens/hostdashboard/HostHelpDesk';
import HostRevenue from '../screens/oldHostonboarding/revenueTool';
import Detailpage from '../screens/detailpage';
import onBoarding1 from '../screens/bookingprocess/bookingProcess';
import personalDetailsForm from '../screens/bookingprocess/personalDetailsForm';
import finalBookingOverview from '../screens/bookingprocess/finalBookingOverview';
import simulateStripe from '../screens/bookingprocess/simulateStripe';
import paymentAccepted from '../screens/bookingprocess/paymentAccepted';
import paymentDeclined from '../screens/bookingprocess/paymentDeclined';
import bookedAccommodation from '../screens/bookingprocess/bookedAccommodation';
import ListProperty from '../screens/oldHostonboarding/listProperty';
import LocationFillIn from '../screens/oldHostonboarding/LocationFillIn';
import selectAmenities from '../screens/oldHostonboarding/selectAmenities';
import PriceProperty from '../screens/oldHostonboarding/PriceProperty';
import SignupScreen from '../screens/login/signup';
import LoginScreen from '../screens/login/loginScreen';
import Register from '../screens/login/register';
import ConfirmMail from '../screens/login/confirmMail';
import HostDetailPage from '../screens/hostdashboard/HostDetailPage';
import ReviewAndSubmitScreen from '../screens/oldHostonboarding/ReviewAndSubmitScreen';
import MessagesStackNavigator from './messagesStackNavigator';
import InboxHost from '../screens/message/chatInboxHost';
import HostDashboard from '../screens/hostdashboard/HostDashboard';
import HomeScreen from "../screens/homeScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Home Stack Navigator
function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="homeScreen" component={HomeScreen} />
      <Stack.Screen name="LoginScreen" component={LoginScreen} />
      <Stack.Screen name="SignupScreen" component={SignupScreen} />
      <Stack.Screen name="GuestDashboard" component={GuestDashboard} />
      <Stack.Screen name="Scan" component={Scan} />
      <Stack.Screen name="Pay" component={Pay} />
      <Stack.Screen name="Bookings" component={Bookings} />
      <Stack.Screen name="Pocket" component={Pocket} />
      <Stack.Screen name="Detailpage" component={Detailpage} />
      <Stack.Screen name="onBoarding1" component={onBoarding1} />
      <Stack.Screen name="HostDashboard" component={HostDashboard} />
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
      <Stack.Screen name="Landing" component={Landing} />
      <Stack.Screen name="GuestProfileTab" component={GuestProfileTab} />
      <Stack.Screen name="GuestPaymentsTab" component={GuestPaymentsTab} />
      <Stack.Screen name="GuestReviewsTab" component={GuestReviewsTab} />
      <Stack.Screen name="GuestSettingsTab" component={GuestSettingsTab} />
      <Stack.Screen
        name="GuestHelpAndFeedbackTab"
        component={GuestHelpAndFeedbackTab}
      />
      <Stack.Screen name="HostHomepage" component={HostHomepage} />
      <Stack.Screen name="HostDashboardTab" component={HostDashboardTab} />
      <Stack.Screen name="HostCalendarTab" component={HostCalendarTab} />
      <Stack.Screen name="HostReviewsTab" component={HostReviewsTab} />
      <Stack.Screen name="HostProfileTab" component={HostProfileTab} />
      <Stack.Screen name="OnboardingHost" component={OnboardingHost} />
      <Stack.Screen name="HostPaymentsTab" component={HostPaymentsTab} />
      <Stack.Screen name="HostListingsTab" component={HostListingsTab} />
      <Stack.Screen name="HostSettingsTab" component={HostSettingsTab} />
      <Stack.Screen name="emailSettings" component={emailSettings} />
      <Stack.Screen name="HostHelpDesk" component={HostHelpDesk} />
      <Stack.Screen name="HostRevenue" component={HostRevenue} />
      <Stack.Screen name="ListProperty" component={ListProperty} />
      <Stack.Screen name="LocationFillIn" component={LocationFillIn} />
      <Stack.Screen name="selectAmenities" component={selectAmenities} />
      <Stack.Screen name="PriceProperty" component={PriceProperty} />
      <Stack.Screen name="Register" component={Register} />
      <Stack.Screen name="ConfirmEmail" component={ConfirmMail} />
      <Stack.Screen name="HostDetailPage" component={HostDetailPage} />
      <Stack.Screen name="HostInbox" component={InboxHost} />
      <Stack.Screen
        name="ReviewAndSubmitScreen"
        component={ReviewAndSubmitScreen}
      />
    </Stack.Navigator>
  );
}

// Bottom Tab Navigator
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
            case 'MessagesTab': // Renamed tab name to avoid conflict
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
                {route.name === 'MessagesTab' ? 'Messages' : route.name}
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
      <Tab.Screen
        name="MessagesTab" // Renamed tab name to avoid duplicate warning
        component={MessagesStackNavigator}
        options={{headerShown: false}}
      />
      <Tab.Screen name="Account" component={AccountPage} />
    </Tab.Navigator>
  );
}

export default BottomTabNavigator;
