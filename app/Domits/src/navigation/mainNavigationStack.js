import {createNativeStackNavigator} from '@react-navigation/native-stack';
import GuestHome from '../screens/accounthome/guestaccounthome/screens/GuestHome';
import Scan from '../header/scan';
import Pay from '../header/pay';
import GuestBookings from '../header/bookings';
import Pocket from '../header/pocket';
import PropertyDetails from '../screens/propertyDetailsScreen/screens/propertyDetailsScreen';
import GuestNewConfirmedBooking from '../screens/guestdashboard/screens/GuestBookingsTab';
import HostOnboardingLanding from '../screens/Landing';
import GuestProfile from '../screens/profile/guestprofile/screens/GuestProfileTab';
import GuestPaymentMethods from '../screens/guestdashboard/GuestPaymentsTab';
import GuestReviews from '../screens/guestdashboard/GuestReviewsTab';
import GuestSettings from '../screens/guestdashboard/GuestSettingsTab';
import HelpAndFeedback from '../screens/guestdashboard/GuestHelpAndFeedbackTab';
import HostHome from '../screens/accounthome/hostaccounthome/screens/HostHome';
import HostCalendar from '../features/hostdashboard/hostcalendar/screens/HostCalendarTab';
import HostReviews from '../features/hostdashboard/hostreviews/screens/HostReviewsTab';
import HostProfile from '../screens/profile/hostprofile/HostProfileTab';
import HostOnboarding from '../screens/apphostonboarding/OnboardingHost';
import HostPayments from '../features/hostdashboard/hostfinance/screens/HostPaymentsTab';
import HostListings from '../features/hostdashboard/hostproperty/screens/HostListingsTab';
import HostSettings from '../screens/profile/hostprofile/screens/HostSettingsTab';
import HostHelpDesk from '../features/hostdashboard/hosthelpdesk/screens/HostHelpDesk';
import React from 'react';
import HostDashboard from '../features/hostdashboard/screens/HostDashboardTab';
import HostReviewPropertyChanges from '../screens/oldHostonboarding/ReviewAndSubmitScreen';
import HomeScreen from '../screens/home/screens/Home';
import {
    FEEDBACK_SCREEN,
    GUEST_BOOKINGS_SCREEN,
    GUEST_DASHBOARD_SCREEN,
    GUEST_NEW_CONFIRMED_BOOKING_SCREEN,
    GUEST_PAYMENT_METHODS_SCREEN,
    GUEST_PROFILE_SCREEN,
    GUEST_REVIEWS_SCREEN,
    GUEST_SETTINGS_SCREEN,
    HOME_SCREEN,
    HOST_CALENDAR_SCREEN,
    HOST_DASHBOARD_SCREEN,
    HOST_HELP_DESK_SCREEN,
    HOST_HOME_SCREEN,
    HOST_LISTINGS_SCREEN,
    HOST_ONBOARDING_LANDING_SCREEN,
    HOST_ONBOARDING_SCREEN,
    HOST_PAYMENTS_SCREEN,
    HOST_PROFILE_SCREEN,
    HOST_REVIEW_PROPERTY_CHANGES_SCREEN,
    HOST_REVIEWS_SCREEN,
    HOST_SETTINGS_SCREEN,
    PAY_SCREEN,
    POCKET_SCREEN,
    PROPERTY_DETAILS_SCREEN,
    SCAN_SCREEN,
    STRIPE_PROCESS_SCREEN
} from './utils/NavigationNameConstants';
import StripePayment from "../features/bookingengine/stripe/screens/StripePayment";

const Stack = createNativeStackNavigator();

function MainNavigationStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                contentStyle: {backgroundColor: "#FFFFFF"}
            }}>
            {/* General */}
            <Stack.Screen name={HOME_SCREEN} component={HomeScreen}/>
            <Stack.Screen name={FEEDBACK_SCREEN} component={HelpAndFeedback}/>

            {/* Features */}
            <Stack.Screen name={SCAN_SCREEN} component={Scan}/>
            <Stack.Screen name={PAY_SCREEN} component={Pay}/>
            <Stack.Screen name={POCKET_SCREEN} component={Pocket}/>

            {/* Host */}
            <Stack.Screen name={HOST_HOME_SCREEN} component={HostHome}/>
            <Stack.Screen name={HOST_PROFILE_SCREEN} component={HostProfile}/>
            <Stack.Screen name={HOST_SETTINGS_SCREEN} component={HostSettings}/>
            <Stack.Screen name={HOST_HELP_DESK_SCREEN} component={HostHelpDesk}/>
            <Stack.Screen name={HOST_LISTINGS_SCREEN} component={HostListings}/>

            {/* Host Dashboard */}
            <Stack.Screen name={HOST_DASHBOARD_SCREEN} component={HostDashboard}/>
            <Stack.Screen name={HOST_CALENDAR_SCREEN} component={HostCalendar}/>
            <Stack.Screen name={HOST_REVIEWS_SCREEN} component={HostReviews}/>
            <Stack.Screen name={HOST_PAYMENTS_SCREEN} component={HostPayments}/>

            {/* Host Onboarding */}
            <Stack.Screen
                name={HOST_ONBOARDING_LANDING_SCREEN}
                component={HostOnboardingLanding}
            />
            <Stack.Screen name={HOST_ONBOARDING_SCREEN} component={HostOnboarding}/>
            <Stack.Screen
                name={HOST_REVIEW_PROPERTY_CHANGES_SCREEN}
                component={HostReviewPropertyChanges}
            />

            {/* Guest */}
            <Stack.Screen name={GUEST_DASHBOARD_SCREEN} component={GuestHome}/>
            <Stack.Screen name={GUEST_PROFILE_SCREEN} component={GuestProfile}/>
            <Stack.Screen name={GUEST_SETTINGS_SCREEN} component={GuestSettings}/>
            <Stack.Screen
                name={GUEST_PAYMENT_METHODS_SCREEN}
                component={GuestPaymentMethods}
            />
            <Stack.Screen name={GUEST_REVIEWS_SCREEN} component={GuestReviews}/>
            <Stack.Screen name={GUEST_BOOKINGS_SCREEN} component={GuestBookings}/>

            {/* Property */}
            <Stack.Screen
                name={PROPERTY_DETAILS_SCREEN}
                component={PropertyDetails}
            />

            {/* Booking Engine */}
            <Stack.Screen name={STRIPE_PROCESS_SCREEN} component={StripePayment}/>
            <Stack.Screen
                name={GUEST_NEW_CONFIRMED_BOOKING_SCREEN}
                component={GuestNewConfirmedBooking}
            />
        </Stack.Navigator>
    );
}

export default MainNavigationStack;
