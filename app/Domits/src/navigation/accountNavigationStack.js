import {createNativeStackNavigator} from '@react-navigation/native-stack';
import LoginScreen from '../screens/login/loginScreen';
import Register from '../screens/login/register';
import HostProfileTab from '../screens/hostdashboard/HostProfileTab';
import GuestProfileTab from '../screens/guestdashboard/GuestProfileTab';
import ConfirmEmail from '../screens/login/confirmMail';
import React from 'react';
import AccountDashboardHeader from '../screens/accountDashboard/components/header';
import AccountDashboard from '../screens/accountDashboard/pages/main';

const Stack = createNativeStackNavigator();

function AccountNavigationStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        header: AccountDashboardHeader,
      }}>
      <Stack.Screen name={'AccountDashboard'} component={AccountDashboard} />
      <Stack.Screen name={'HostProfile'} component={HostProfileTab} />
      <Stack.Screen name={'GuestProfile'} component={GuestProfileTab} />
      <Stack.Screen name={'Login'} component={LoginScreen} />
      <Stack.Screen name={'Register'} component={Register} />
      <Stack.Screen name={'ConfirmEmail'} component={ConfirmEmail} />
    </Stack.Navigator>
  );
}

export default AccountNavigationStack;
