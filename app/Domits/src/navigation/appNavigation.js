import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/homeScreen';
import HostDashboard from '../screens/hostdashboard/hostDashboard';
import GuestDashboard from '../screens/guestdashboard/guestDashboard';
import BottomTabNavigator from '../components/BottomTabNavigator';
import Profile from '../screens/guestdashboard/profile';
import PaymentMethods from '../screens/guestdashboard/paymentMethods';
import Reviews from '../screens/guestdashboard/reviews';
import Settings from '../screens/guestdashboard/settings';
import HelpAndFeedback from '../screens/guestdashboard/helpAndFeedback';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function DashboardNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      {/* Assuming Messages and AccountPage are valid components */}
      <Tab.Screen name="Messages" component={Messages} />
      <Tab.Screen name="Account" component={AccountPage} />
    </Tab.Navigator>
  );
}

function AppNavigation() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // Hide the header for all screens
      }}>
      <Stack.Screen name="Dashboard" component={BottomTabNavigator} />
      <Stack.Screen name="HostDashboard" component={HostDashboard} />
      <Stack.Screen name="GuestDashboard" component={GuestDashboard} />
      <Stack.Screen name="PaymentMethods" component={PaymentMethods} />
      <Stack.Screen name="Profile" component={Profile} />
      <Stack.Screen name="Reviews" component={Reviews} />
      <Stack.Screen name="Settings" component={Settings} />
      <Stack.Screen name="HelpAndFeedback" component={HelpAndFeedback} />
    </Stack.Navigator>
  );
}

export default AppNavigation;
