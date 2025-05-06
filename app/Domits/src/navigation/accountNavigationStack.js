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
    GUEST_PAYMENT_METHODS_SCREEN,
    GUEST_PROFILE_SCREEN,
    GUEST_REVIEWS_SCREEN,
    HOST_CALENDAR_SCREEN,
    HOST_DASHBOARD_SCREEN,
    HOST_HELP_DESK_SCREEN,
    HOST_PROPERTIES_SCREEN,
    HOST_ONBOARDING_LANDING_SCREEN,
    HOST_ONBOARDING_SCREEN,
    HOST_PAYMENTS_SCREEN,
    HOST_PROFILE_SCREEN,
    HOST_RESERVATIONS_SCREEN,
    HOST_REVIEW_PROPERTY_CHANGES_SCREEN,
    HOST_REVIEWS_SCREEN,
    HOST_SETTINGS_SCREEN,
    LOGIN_SCREEN,
    REGISTER_SCREEN
} from './utils/NavigationNameConstants';
import AppSettingsTab from "../screens/accounthome/features/appsettings/screens/AppSettingsTab";
import GuestReviews from "../screens/guestdashboard/GuestReviewsTab";
import GuestPaymentMethods from "../screens/guestdashboard/GuestPaymentsTab";
import HostOnboardingLanding from "../screens/Landing";
import HostOnboarding from "../screens/apphostonboarding/OnboardingHost";
import HostReviewPropertyChanges from "../screens/oldHostonboarding/ReviewAndSubmitScreen";
import HostDashboard from "../features/hostdashboard/screens/HostDashboardTab";
import HostCalendar from "../features/hostdashboard/hostcalendar/screens/HostCalendarTab";
import HostReviews from "../features/hostdashboard/hostreviews/screens/HostReviewsTab";
import HostPayments from "../features/hostdashboard/hostfinance/screens/HostPaymentsTab";
import HostReservations from "../screens/hostdashboard/features/reservations/screens/ReservationsTab";
import HostSettings from "../screens/profile/hostprofile/screens/HostSettingsTab";
import HostHelpDesk from "../features/hostdashboard/hosthelpdesk/screens/HostHelpDesk";
import HostProperties from "../features/hostdashboard/hostproperty/screens/HostListingsTab";

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
            <Stack.Screen name={HOST_SETTINGS_SCREEN} component={HostSettings}/>
            <Stack.Screen name={HOST_HELP_DESK_SCREEN} component={HostHelpDesk}/>
            <Stack.Screen name={HOST_PROPERTIES_SCREEN} component={HostProperties}/>

            {/* Host Dashboard */}
            <Stack.Screen name={HOST_DASHBOARD_SCREEN} component={HostDashboard}/>
            <Stack.Screen name={HOST_CALENDAR_SCREEN} component={HostCalendar}/>
            <Stack.Screen name={HOST_REVIEWS_SCREEN} component={HostReviews}/>
            <Stack.Screen name={HOST_PAYMENTS_SCREEN} component={HostPayments}/>
            <Stack.Screen name={HOST_RESERVATIONS_SCREEN} component={HostReservations}/>

            {/* Host Onboarding */}
            <Stack.Screen name={HOST_ONBOARDING_LANDING_SCREEN} component={HostOnboardingLanding}/>
            <Stack.Screen name={HOST_ONBOARDING_SCREEN} component={HostOnboarding}/>
            <Stack.Screen name={HOST_REVIEW_PROPERTY_CHANGES_SCREEN} component={HostReviewPropertyChanges}/>

            {/* Guest */}
            <Stack.Screen name={GUEST_PROFILE_SCREEN} component={GuestProfileTab}/>
            <Stack.Screen name={GUEST_REVIEWS_SCREEN} component={GuestReviews}/>
            <Stack.Screen name={GUEST_PAYMENT_METHODS_SCREEN} component={GuestPaymentMethods}/>

            {/* App Preferences */}
            <Stack.Screen name={APP_SETTINGS_SCREEN} component={AppSettingsTab}/>

            {/* Help & Support */}
            <Stack.Screen name={FEEDBACK_SCREEN} component={Feedback}/>

        </Stack.Navigator>
    );
}

export default AccountNavigationStack;