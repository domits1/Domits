// appNavigation.js

import React from 'react';
<<<<<<< HEAD
import { createNativeStackNavigator } from '@react-navigation/native-stack';
=======
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
>>>>>>> 54afc68e1ce871f0002427b0b08e817c546ee051
import HomeScreen from '../screens/homeScreen';
import HostDashboard from '../screens/hostdashboard/hostDashboard';
import GuestDashboard from '../screens/guestdashboard/guestDashboard';
<<<<<<< HEAD
import BottomTabNavigator from '../components/BottomTabNavigator';
=======
>>>>>>> 984b42016b7deb3c017bc703f26de8d6230be7b1

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function DashboardNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Messages" component={Messages} />
      <Tab.Screen name="Account" component={AccountPage} />
    </Tab.Navigator>
  );
}

function AppNavigation() {
  return (
    <Stack.Navigator
      screenOptions={{
<<<<<<< HEAD
        headerShown: false, // Hiermee wordt de volledige header verborgen
      }}>
      <Stack.Screen name="Home" component={HomeScreen} />
=======
        headerShown: false, // Hide the header for all screens
      }}>
      <Stack.Screen name="Dashboard" component={BottomTabNavigator} />
>>>>>>> 54afc68e1ce871f0002427b0b08e817c546ee051
      <Stack.Screen name="HostDashboard" component={HostDashboard} />
      <Stack.Screen name="GuestDashboard" component={GuestDashboard} />
    </Stack.Navigator>
  );
}

export default AppNavigation;
