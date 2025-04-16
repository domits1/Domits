import {createNativeStackNavigator} from "@react-navigation/native-stack";
import Account from "../screens/account";
import LoginScreen from "../screens/login/loginScreen";
import Register from "../screens/login/register";
import HostProfileTab from "../screens/hostprofile/HostProfileTab";
import GuestProfileTab from "../screens/guestdashboard/GuestProfileTab";
import ConfirmEmail from "../screens/login/confirmMail";
import React from "react";
import emailSettings from "../screens/hostprofile/emailSettings";
import settings from "../screens/guestdashboard/GuestSettingsTab";
import HostSettings from "../screens/hostprofile/HostSettingsTab";

const Stack = createNativeStackNavigator();

function AccountNavigationStack() {
    return (
        <Stack.Navigator
            screenOptions={{headerShown: false,}}>
            {/* Account */}
            <Stack.Screen name={"login"} component={LoginScreen}/>
            <Stack.Screen name={"register"} component={Register}/>
            <Stack.Screen name={"account"} component={Account}/>

            {/* Account settings*/}
            <Stack.Screen name="host-account-settings" component={HostSettings}/>
            <Stack.Screen name={"guest-account-settings"} component={settings}/>
            <Stack.Screen name={"change-account-settings"} component={emailSettings}/>
            <Stack.Screen name={"confirm-email"} component={ConfirmEmail}/>

            {/* Host */}
            <Stack.Screen name={"host-profile"} component={HostProfileTab}/>

            {/* Guest */}
            <Stack.Screen name={"guest-profile"} component={GuestProfileTab}/>
        </Stack.Navigator>
    );
}

export default AccountNavigationStack;