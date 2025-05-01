import {createNativeStackNavigator} from "@react-navigation/native-stack";
import Account from "../screens/account";
import LoginScreen from "../screens/login/loginScreen";
import Register from "../screens/login/screens/register";
import HostProfileTab from "../screens/profile/hostprofile/HostProfileTab";
import GuestProfileTab from "../screens/profile/guestprofile/screens/GuestProfileTab";
import ConfirmEmail from "../screens/login/confirmMail";
import React from "react";
import emailSettings from "../screens/profile/hostprofile/emailSettings";
import AccountDashboard from "../screens/accounthome/features/accountdashboard/screens/AccountDashboardTab";
import AccountHome from "../screens/accounthome/screens/AccountHome";
import Feedback from "../screens/accounthome/features/feedback/screens/FeedbackTab.js";
import {
    ACCOUNT_DASHBOARD_SCREEN,
    ACCOUNT_HOME_SCREEN,
    ACCOUNT_SCREEN,
    APP_SETTINGS_SCREEN,
    CHANGE_ACCOUNT_SETTINGS_SCREEN,
    CONFIRM_EMAIL_SCREEN,
    FEEDBACK_SCREEN,
    GUEST_PROFILE_SCREEN,
    HOST_PROFILE_SCREEN,
    LOGIN_SCREEN,
    REGISTER_SCREEN
} from './utils/NavigationNameConstants';
import AppSettingsTab from "../screens/accounthome/features/appsettings/screens/AppSettingsTab";

const Stack = createNativeStackNavigator();

function AccountNavigationStack() {
    return (
        <Stack.Navigator
            screenOptions={{headerShown: false,}}>
            {/* Account */}
            <Stack.Screen name={LOGIN_SCREEN} component={LoginScreen}/>
            <Stack.Screen name={REGISTER_SCREEN} component={Register}/>
            <Stack.Screen name={ACCOUNT_SCREEN} component={Account}/>
            <Stack.Screen name={ACCOUNT_HOME_SCREEN} component={AccountHome}/>

            {/* Account Settings */}
            <Stack.Screen name={ACCOUNT_DASHBOARD_SCREEN} component={AccountDashboard}/>
            <Stack.Screen name={CHANGE_ACCOUNT_SETTINGS_SCREEN} component={emailSettings}/>
            <Stack.Screen name={CONFIRM_EMAIL_SCREEN} component={ConfirmEmail}/>

            {/* Host */}
            <Stack.Screen name={HOST_PROFILE_SCREEN} component={HostProfileTab}/>

            {/* Guest */}
            <Stack.Screen name={GUEST_PROFILE_SCREEN} component={GuestProfileTab}/>

            {/* App Preferences */}
            <Stack.Screen name={APP_SETTINGS_SCREEN} component={AppSettingsTab}/>

            {/* Help & Support */}
            <Stack.Screen name={FEEDBACK_SCREEN} component={Feedback}/>

        </Stack.Navigator>
    );
}

export default AccountNavigationStack;