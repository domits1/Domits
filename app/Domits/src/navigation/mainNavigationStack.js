import {createNativeStackNavigator} from "@react-navigation/native-stack";
import HomeScreen from "../screens/homeScreen";
import GuestDashboard from "../screens/guestdashboard/guestDashboard";
import Scan from "../header/scan";
import Pay from "../header/pay";
import Bookings from "../header/bookings";
import Pocket from "../header/pocket";
import PropertyDetailsScreen from "../screens/propertyDetailsScreen/screens/propertyDetailsScreen";
import BookingProcess from "../features/bookingengine/screens/BookingEngineScreen";
import simulateStripe from "../features/bookingengine/simulateStripe";
import paymentAccepted from "../features/bookingengine/screens/PaymentAcceptedScreen";
import paymentDeclined from "../features/bookingengine/screens/PaymentDeclinedScreen";
import guestBookings from "../screens/guestdashboard/screens/GuestBookingsTab";
import Landing from "../screens/Landing";
import profile from "../screens/guestdashboard/GuestProfileTab";
import paymentMethods from "../screens/guestdashboard/GuestPaymentsTab";
import reviews from "../screens/guestdashboard/GuestReviewsTab";
import settings from "../screens/guestdashboard/GuestSettingsTab";
import helpAndFeedback from "../screens/guestdashboard/GuestHelpAndFeedbackTab";
import HostHomeScreen from "../features/hostdashboard/screens/HostHomeScreen";
import HostCalendar from "../features/hostdashboard/hostcalendar/screens/HostCalendarTab";
import HostReviews from "../features/hostdashboard/hostreviews/screens/HostReviewsTab";
import HostProfile from "../screens/hostprofile/HostProfileTab";
import OnboardingHost from "../screens/apphostonboarding/OnboardingHost";
import HostPayments from "../features/hostdashboard/hostfinance/screens/HostPaymentsTab";
import HostListings from "../features/hostdashboard/hostproperty/screens/HostListingsTab";
import ListProperty from "../features/hostdashboard/hostproperty/screens/HostListingsTab";
import HostSettings from "../screens/hostprofile/HostSettingsTab";
import emailSettings from "../screens/hostprofile/emailSettings";
import HostHelpDesk from "../features/hostdashboard/hosthelpdesk/screens/HostHelpDesk";
import React from "react";
import HostDashboard from "../features/hostdashboard/screens/HostDashboardTab";
import ReviewAndSubmitScreen from "../screens/oldHostonboarding/ReviewAndSubmitScreen";

const Stack = createNativeStackNavigator();

function MainNavigationStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
            }}>
            {/* General */}
            <Stack.Screen name="HomeScreen" component={HomeScreen}/>
            <Stack.Screen name="HelpAndFeedback" component={helpAndFeedback}/>

            {/* Features */}
            <Stack.Screen name="Scan" component={Scan}/>
            <Stack.Screen name="Pay" component={Pay}/>
            <Stack.Screen name="Pocket" component={Pocket}/>

            {/* User */}
            <Stack.Screen name="emailSettings" component={emailSettings}/>
            <Stack.Screen name="Settings" component={settings}/>

            {/* Host */}
            <Stack.Screen name="HostHomeScreen" component={HostHomeScreen}/>
            <Stack.Screen name="HostProfile" component={HostProfile}/>
            <Stack.Screen name="HostSettings" component={HostSettings}/>
            <Stack.Screen name="HostHelpDesk" component={HostHelpDesk}/>
            <Stack.Screen name="ListProperty" component={ListProperty}/>

            {/* Host dashboard */}
            <Stack.Screen name="HostDashboard" component={HostDashboard}/>
            <Stack.Screen name="HostCalendar" component={HostCalendar}/>
            <Stack.Screen name="HostReviews" component={HostReviews}/>
            <Stack.Screen name="HostPayments" component={HostPayments}/>
            <Stack.Screen name="HostListings" component={HostListings}/>

            {/* Host Onboarding */}
            <Stack.Screen name="Landing" component={Landing}/>
            <Stack.Screen name="OnboardingHost" component={OnboardingHost}/>
            <Stack.Screen name="ReviewAndSubmitScreen" component={ReviewAndSubmitScreen}/>

            {/* Guest */}
            <Stack.Screen name="GuestDashboard" component={GuestDashboard}/>
            <Stack.Screen name="Profile" component={profile}/>
            <Stack.Screen name="guestBookings" component={guestBookings}/>
            <Stack.Screen name="PaymentMethods" component={paymentMethods}/>
            <Stack.Screen name="Reviews" component={reviews}/>
            <Stack.Screen name="Bookings" component={Bookings}/>

            {/* Property */}
            <Stack.Screen name="Detailpage" component={PropertyDetailsScreen}/>

            {/* Booking Engine*/}
            <Stack.Screen name="BookingProcess" component={BookingProcess}/>
            <Stack.Screen name="simulateStripe" component={simulateStripe}/>
            <Stack.Screen name="paymentAccepted" component={paymentAccepted}/>
            <Stack.Screen name="paymentDeclined" component={paymentDeclined}/>

        </Stack.Navigator>
    );
}

export default MainNavigationStack;