import {createNativeStackNavigator} from "@react-navigation/native-stack";
import Scan from "../header/scan";
import Pay from "../header/pay";
import GuestBookings from "../screens/guestdashboard/screens/GuestBookings";
import Pocket from "../header/pocket";
import PropertyDetails from "../screens/propertyDetailsScreen/screens/propertyDetailsScreen";
import BookingProcess from "../features/bookingengine/screens/BookingEngineScreen";
import SimulateStripe from "../features/bookingengine/simulateStripe";
import PaymentAccepted from "../features/bookingengine/screens/PaymentAcceptedScreen";
import PaymentDeclined from "../features/bookingengine/screens/PaymentDeclinedScreen";
import GuestNewConfirmedBooking from "../screens/guestdashboard/screens/GuestBookingsTab";
import HostProfile from "../screens/profile/hostprofile/HostProfileTab";
import React from "react";
import Home from "../features/search/HomeScreen";
import {
    BOOKING_PROCESS_SCREEN,
    GUEST_BOOKINGS_SCREEN,
    GUEST_NEW_CONFIRMED_BOOKING_SCREEN,
    HOME_SCREEN,
    HOST_PROFILE_SCREEN,
    PAY_SCREEN,
    PAYMENT_ACCEPTED_SCREEN,
    PAYMENT_DECLINED_SCREEN,
    POCKET_SCREEN,
    PROPERTY_DETAILS_SCREEN,
    SCAN_SCREEN,
    SIMULATE_STRIPE_SCREEN,
} from './utils/NavigationNameConstants';

const Stack = createNativeStackNavigator();

function MainNavigationStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
            }}>
            {/* General */}
            <Stack.Screen name={HOME_SCREEN} component={Home}/>

            {/* Features */}
            <Stack.Screen name={SCAN_SCREEN} component={Scan}/>
            <Stack.Screen name={PAY_SCREEN} component={Pay}/>
            <Stack.Screen name={POCKET_SCREEN} component={Pocket}/>

            {/* Host */}
            <Stack.Screen name={HOST_PROFILE_SCREEN} component={HostProfile}/>

            {/* Guest */}
            <Stack.Screen name={GUEST_BOOKINGS_SCREEN} component={GuestBookings}/>

            {/* Property */}
            <Stack.Screen name={PROPERTY_DETAILS_SCREEN} component={PropertyDetails}/>

            {/* Booking Engine */}
            <Stack.Screen name={BOOKING_PROCESS_SCREEN} component={BookingProcess}/>
            <Stack.Screen name={SIMULATE_STRIPE_SCREEN} component={SimulateStripe}/>
            <Stack.Screen name={PAYMENT_ACCEPTED_SCREEN} component={PaymentAccepted}/>
            <Stack.Screen name={PAYMENT_DECLINED_SCREEN} component={PaymentDeclined}/>
            <Stack.Screen name={GUEST_NEW_CONFIRMED_BOOKING_SCREEN} component={GuestNewConfirmedBooking}/>
        </Stack.Navigator>
    );
}

export default MainNavigationStack;