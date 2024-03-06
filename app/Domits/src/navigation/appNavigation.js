// appNavigation.js

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/homeScreen';
import HostDashboard from '../screens/hostdashboard/hostDashboard';
import GuestDashboard from '../screens/guestdashboard/guestDashboard';
import BottomTabNavigator from '../components/BottomTabNavigator';

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
                headerShown: false, // Hide the header for all screens
            }}>
            <Stack.Screen name="Dashboard" component={BottomTabNavigator} />
            <Stack.Screen name="HostDashboard" component={HostDashboard} />
            <Stack.Screen name="GuestDashboard" component={GuestDashboard} />
        </Stack.Navigator>
    );
}


export default AppNavigation;
