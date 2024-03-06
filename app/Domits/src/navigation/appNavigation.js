import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/homeScreen';
import HostDashboard from '../screens/hostdashboard/hostDashboard';
import GuestDashboard from '../screens/guestdashboard/guestDashboard';
<<<<<<< HEAD
import BottomTabNavigator from '../components/BottomTabNavigator';
=======
>>>>>>> 984b42016b7deb3c017bc703f26de8d6230be7b1

const Stack = createNativeStackNavigator();

function AppNavigation() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // Hiermee wordt de volledige header verborgen
      }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="HostDashboard" component={HostDashboard} />
      <Stack.Screen name="GuestDashboard" component={GuestDashboard} />
      <Stack.Screen
        name="Main"
        component={BottomTabNavigator}
        options={{headerShown: false}}
      />
    </Stack.Navigator>
  );
}

export default AppNavigation;
