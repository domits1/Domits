import {createNativeStackNavigator} from "@react-navigation/native-stack";
import HomeScreen from "../features/search/HomeScreen";
import LoginScreen from "../screens/login/loginScreen";
import SignupScreen from "../screens/login/signup";
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
import HostDashboard from "../features/hostdashboard/screens/HostDashboard";
import HostCalendar from "../features/hostdashboard/hostcalendar/screens/HostCalendarTab";
import HostReviews from "../features/hostdashboard/hostreviews/screens/HostReviewsTab";
import HostProfile from "../screens/hostprofile/HostProfileTab";
import OnboardingHost from "../screens/apphostonboarding/OnboardingHost";
import HostPayments from "../features/hostdashboard/hostfinance/screens/HostPaymentsTab";
import HostListings from "../features/hostdashboard/hostproperty/screens/HostListingsTab";
import HostSettings from "../screens/hostprofile/HostSettingsTab";
import emailSettings from "../screens/hostprofile/emailSettings";
import HostHelpDesk from "../features/hostdashboard/hosthelpdesk/screens/HostHelpDesk";
import ListProperty from "../features/hostdashboard/hostproperty/screens/HostListingsTab";
import Register from "../screens/login/register";
import ConfirmMail from "../screens/login/confirmMail";
import HostDetailPage from "../screens/propertyDetailsScreen/screens/HostDetailPage";
import React from "react";
import HostDashboardTab from "../features/hostdashboard/screens/HostDashboardTab";

const Stack = createNativeStackNavigator();

function MainNavigationStack() {
    return (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}>
        <Stack.Screen name="HomeScreen" component={HomeScreen} />
        <Stack.Screen name="GuestDashboard" component={GuestDashboard} />
        <Stack.Screen name="Scan" component={Scan} />
        <Stack.Screen name="Pay" component={Pay} />
        <Stack.Screen name="Bookings" component={Bookings} />
        <Stack.Screen name="Pocket" component={Pocket} />
        <Stack.Screen name="Detailpage" component={PropertyDetailsScreen} />
        <Stack.Screen name="BookingProcess" component={BookingProcess} />
        <Stack.Screen name="simulateStripe" component={simulateStripe} />
        <Stack.Screen name="paymentAccepted" component={paymentAccepted} />
        <Stack.Screen name="paymentDeclined" component={paymentDeclined} />
        <Stack.Screen name="guestBookings" component={guestBookings} />
        <Stack.Screen name="Landing" component={Landing} />
        <Stack.Screen name="Profile" component={profile} />
        <Stack.Screen name="PaymentMethods" component={paymentMethods} />
        <Stack.Screen name="Reviews" component={reviews} />
        <Stack.Screen name="Settings" component={settings} />
        <Stack.Screen name="HelpAndFeedback" component={helpAndFeedback} />
        {/* Host */}
          {/*<Stack.Screen name="HostHomepage" component={HostHomepage} />*/}
        <Stack.Screen name="HostDashboard" component={HostDashboard} />
        <Stack.Screen name="HostDashboardTab" component={HostDashboardTab} />
        <Stack.Screen name="HostProfile" component={HostProfile} />
        <Stack.Screen name="HostCalendar" component={HostCalendar} />
        <Stack.Screen name="HostReviews" component={HostReviews} />
        <Stack.Screen name="OnboardingHost" component={OnboardingHost} />
        <Stack.Screen name="HostPayments" component={HostPayments} />
        <Stack.Screen name="HostListings" component={HostListings} />
        <Stack.Screen name="HostSettings" component={HostSettings} />
        <Stack.Screen name="HostHelpDesk" component={HostHelpDesk} />

        <Stack.Screen name="emailSettings" component={emailSettings} />
        <Stack.Screen name="ListProperty" component={ListProperty} />
        {/*<Stack.Screen name="LocationFillIn" component={LocationFillIn} />*/}
        {/*<Stack.Screen name="selectAmenities" component={selectAmenities} />*/}
        {/*<Stack.Screen name="PriceProperty" component={PriceProperty} />*/}
        <Stack.Screen name="HostDetailPage" component={HostDetailPage} />
        {/*<Stack.Screen*/}
        {/*  name="ReviewAndSubmitScreen"*/}
        {/*  component={ReviewAndSubmitScreen}*/}
        {/*/>*/}
      </Stack.Navigator>
    );
}

export default MainNavigationStack;