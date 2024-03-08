import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import HomeScreen from '../screens/homeScreen';
import Messages from '../screens/messages';
import AccountPage from '../screens/account';
import HostDashboard from '../screens/hostdashboard/hostDashboard';
import GuestDashboard from '../screens/guestdashboard/guestDashboard';
import Header from '../header/header';
import Scan from '../header/scan';
import Pay from '../header/pay';
import Bookings from '../header/bookings';
import Pocket from '../header/pocket';
import {View, Text} from 'react-native';
import profile from '../screens/guestdashboard/profile';
import paymentMethods from '../screens/guestdashboard/paymentMethods';
import reviews from '../screens/guestdashboard/reviews';
import settings from '../screens/guestdashboard/settings';
import helpAndFeedback from "../screens/guestdashboard/helpAndFeedback";
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          header: props => <Header {...props} />,
        }}
      />
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="HostDashboard" component={HostDashboard} />
      <Stack.Screen name="GuestDashboard" component={GuestDashboard} />
      <Stack.Screen name="Scan" component={Scan} />
      <Stack.Screen name="Pay" component={Pay} />
      <Stack.Screen name="Bookings" component={Bookings} />
      <Stack.Screen name="Pocket" component={Pocket} />
      <Stack.Screen name="Profile" component={profile} />
      <Stack.Screen name="PaymentMethods" component={paymentMethods} />
      <Stack.Screen name="Reviews" component={reviews} />
      <Stack.Screen name="Settings" component={settings} />
      <Stack.Screen name="HelpAndFeedback" component={helpAndFeedback} />
    </Stack.Navigator>
  );
}

function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: 'white',
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
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Messages" component={Messages} />
      <Tab.Screen name="Account" component={AccountPage} />
    </Tab.Navigator>
  );
}

export default BottomTabNavigator;
