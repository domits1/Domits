import {createNativeStackNavigator} from "@react-navigation/native-stack";
import Account from "../screens/account";
import LoginScreen from "../screens/login/loginScreen";
import Register from "../screens/login/register";
import HostProfileTab from "../screens/hostdashboard/HostProfileTab";
import GuestProfileTab from "../screens/guestdashboard/GuestProfileTab";
import ConfirmEmail from "../screens/login/confirmMail";
import React from "react";

const Stack = createNativeStackNavigator();

function AccountNavigationStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
        <Stack.Screen name={"AccountScreen"} component={Account} />
        <Stack.Screen name={"HostProfile"} component={HostProfileTab} />
        <Stack.Screen name={"GuestProfile"} component={GuestProfileTab} />
        <Stack.Screen name={"Login"} component={LoginScreen} />
        <Stack.Screen name={"Register"} component={Register} />
        <Stack.Screen name={"ConfirmEmail"} component={ConfirmEmail} />

    </Stack.Navigator>
  );
}

export default AccountNavigationStack;