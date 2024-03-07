import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/homeScreen';
import HostDashboard from '../screens/hostdashboard/hostDashboard';
import GuestDashboard from '../screens/guestdashboard/guestDashboard';
import Header from '../header/header';
import Scan from '../header/scan';
import Pay from '../header/pay';
import Bookings from '../header/bookings';
import Pocket from '../header/pocket';

const Stack = createNativeStackNavigator();

function AppNavigation() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, 
      }}>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          header: (props) => <Header {...props} />, 
        }}
      />
      <Stack.Screen name="HostDashboard" component={HostDashboard} />
      <Stack.Screen name="GuestDashboard" component={GuestDashboard} />
      <Stack.Screen name="Scan" component={Scan} />
      <Stack.Screen name="Pay" component={Pay} />
      <Stack.Screen name="Bookings" component={Bookings} />
      <Stack.Screen name="Pocket" component={Pocket} />
    </Stack.Navigator>
  );
}

export default AppNavigation;
