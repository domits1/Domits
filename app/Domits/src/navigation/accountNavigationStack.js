import {createNativeStackNavigator} from "@react-navigation/native-stack";
import React from "react";

import Account from "../screens/account";
import LoginScreen from "../screens/login/loginScreen";
import Register from "../screens/login/register";
import ConfirmEmail from "../screens/login/confirmMail";
import settings from "../screens/guestdashboard/GuestSettingsTab";
import HostSettings from "../screens/profile/hostprofile/screens/HostSettingsTab";
import {
    ACCOUNT_SCREEN,
    CHANGE_ACCOUNT_SETTINGS_SCREEN,
    CONFIRM_EMAIL_SCREEN,
    GUEST_ACCOUNT_SETTINGS_SCREEN,
    GUEST_PROFILE_SCREEN,
    HOST_ACCOUNT_SETTINGS_SCREEN,
    HOST_PROFILE_SCREEN,
    LOGIN_SCREEN,
    REGISTER_SCREEN
} from './utils/NavigationNameConstants';

const Stack = createNativeStackNavigator();

function AccountNavigationStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                contentStyle: {backgroundColor: "#FFFFFF"}
            }}>
            {/* Account */}
            <Stack.Screen name={LOGIN_SCREEN} component={LoginScreen}/>
            <Stack.Screen name={REGISTER_SCREEN} component={Register}/>
            <Stack.Screen name={ACCOUNT_SCREEN} component={Account}/>

            {/* Account Settings */}
            <Stack.Screen name={HOST_ACCOUNT_SETTINGS_SCREEN} component={HostSettings}/>
            <Stack.Screen name={GUEST_ACCOUNT_SETTINGS_SCREEN} component={settings}/>
            {/*<Stack.Screen name={CHANGE_ACCOUNT_SETTINGS_SCREEN} component={emailSettings}/>*/}
            <Stack.Screen name={CONFIRM_EMAIL_SCREEN} component={ConfirmEmail}/>

            {/* Host */}
            {/*<Stack.Screen name={HOST_PROFILE_SCREEN} component={HostProfileTab}/>*/}

            {/* Guest */}
            {/*<Stack.Screen name={GUEST_PROFILE_SCREEN} component={GuestProfileTab}/>*/}
        </Stack.Navigator>
    );
}

export default AccountNavigationStack;