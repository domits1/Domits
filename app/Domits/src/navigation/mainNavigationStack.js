import {createNativeStackNavigator} from "@react-navigation/native-stack";
import GuestHome from "../screens/accounthome/guestaccounthome/screens/GuestHome";
import Scan from "../header/scan";
import Pay from "../header/pay";
import GuestBookings from "../header/bookings";
import Pocket from "../header/pocket";
import PropertyDetails from "../screens/propertyDetailsScreen/screens/propertyDetailsScreen";
import BookingProcess from "../features/bookingengine/screens/BookingEngineScreen";
import SimulateStripe from "../features/bookingengine/simulateStripe";
import PaymentAccepted from "../features/bookingengine/screens/PaymentAcceptedScreen";
import PaymentDeclined from "../features/bookingengine/screens/PaymentDeclinedScreen";
import GuestNewConfirmedBooking from "../screens/guestdashboard/screens/GuestBookingsTab";
import HostOnboardingLanding from "../screens/Landing";
import GuestProfile from "../screens/profile/guestprofile/screens/GuestProfileTab";
import GuestPaymentMethods from "../screens/guestdashboard/GuestPaymentsTab";
import GuestReviews from "../screens/guestdashboard/GuestReviewsTab";
import GuestSettings from "../screens/guestdashboard/GuestSettingsTab";
import HelpAndFeedback from "../screens/guestdashboard/GuestHelpAndFeedbackTab";
import HostHome from "../screens/accounthome/hostaccounthome/screens/HostHome";
import HostCalendar from "../features/hostdashboard/hostcalendar/screens/HostCalendarTab";
import HostReviews from "../features/hostdashboard/hostreviews/screens/HostReviewsTab";
import HostProfile from "../screens/profile/hostprofile/HostProfileTab";
import HostOnboarding from "../screens/apphostonboarding/OnboardingHost";
import HostPayments from "../features/hostdashboard/hostfinance/screens/HostPaymentsTab";
import HostListings from "../features/hostdashboard/hostproperty/screens/HostListingsTab";
import HostSettings from "../screens/profile/hostprofile/screens/HostSettingsTab";
import emailSettings from "../screens/profile/hostprofile/emailSettings";
import HostHelpDesk from "../features/hostdashboard/hosthelpdesk/screens/HostHelpDesk";
import React from "react";
import HostDashboard from "../features/hostdashboard/screens/HostDashboardTab";
import HostReviewPropertyChanges from "../screens/oldHostonboarding/ReviewAndSubmitScreen";
import Home from "../features/search/HomeScreen";

const Stack = createNativeStackNavigator();

function MainNavigationStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
            }}>
            {/* General */}
            <Stack.Screen name="home" component={Home}/>
            <Stack.Screen name="help-and-feedback" component={HelpAndFeedback}/>

            {/* Features */}
            <Stack.Screen name="scan" component={Scan}/>
            <Stack.Screen name="pay" component={Pay}/>
            <Stack.Screen name="pocket" component={Pocket}/>

            {/* Host */}
            <Stack.Screen name="host-home" component={HostHome}/>
            <Stack.Screen name="host-profile" component={HostProfile}/>
            <Stack.Screen name="host-settings" component={HostSettings}/>
            <Stack.Screen name="host-help-desk" component={HostHelpDesk}/>
            <Stack.Screen name="host-listings" component={HostListings}/>

            {/* Host dashboard */}
            <Stack.Screen name="host-dashboard" component={HostDashboard}/>
            <Stack.Screen name="host-calendar" component={HostCalendar}/>
            <Stack.Screen name="host-reviews" component={HostReviews}/>
            <Stack.Screen name="host-payments" component={HostPayments}/>

            {/* Host Onboarding */}
            <Stack.Screen name="host-onboarding-landing" component={HostOnboardingLanding}/>
            <Stack.Screen name="host-onboarding" component={HostOnboarding}/>
            <Stack.Screen name="host-review-property-changes" component={HostReviewPropertyChanges}/>

            {/* Guest */}
            <Stack.Screen name="guest-dashboard" component={GuestHome}/>
            <Stack.Screen name="guest-profile" component={GuestProfile}/>
            <Stack.Screen name="guest-settings" component={GuestSettings}/>
            <Stack.Screen name="guest-payment-methods" component={GuestPaymentMethods}/>
            <Stack.Screen name="guest-reviews" component={GuestReviews}/>
            <Stack.Screen name="guest-bookings" component={GuestBookings}/>

            {/* Property */}
            <Stack.Screen name="property-details" component={PropertyDetails}/>

            {/* Booking Engine*/}
            <Stack.Screen name="booking-process" component={BookingProcess}/>
            <Stack.Screen name="simulate-stripe" component={SimulateStripe}/>
            <Stack.Screen name="payment-accepted" component={PaymentAccepted}/>
            <Stack.Screen name="payment-declined" component={PaymentDeclined}/>
            <Stack.Screen name="guest-new-confirmed-booking" component={GuestNewConfirmedBooking}/>

        </Stack.Navigator>
    );
}

export default MainNavigationStack;