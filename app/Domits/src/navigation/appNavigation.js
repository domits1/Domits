import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/homeScreen';
import HostDashboard from '../screens/hostdashboard/hostDashboard';
import GuestDashboard from '../screens/guestdashboard/guestDashboard';

const Stack = createNativeStackNavigator();

function AppNavigation() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, 
      }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="HostDashboard" component={HostDashboard} />
      <Stack.Screen name="GuestDashboard" component={GuestDashboard} />
    </Stack.Navigator>
  );
}

export default AppNavigation;
