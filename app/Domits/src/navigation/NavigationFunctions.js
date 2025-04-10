import {useNavigation} from "@react-navigation/native";

/**
 * Navigation helper functions to navigate to screens.
 *
 * React Navigation uses strings to navigate screens, making navigations difficult to find and maintain.
 *
 * @param options - Extra parameters to be given in the navigation.
 * @returns - A function to navigate to a screen.
 * @constructor
 */
const NavigateTo = (options) => {
    const navigation = useNavigation();

    return {
        /**
         * Main navigation stack
         */
        // General
        homeScreen: () => navigation.navigate("HomeScreen"),
        helpAndFeedback: () => navigation.navigate("HelpAndFeedback"),

        // Features
        scan: () => navigation.navigate("Scan"),
        pay: () => navigation.navigate("Pay"),
        pocket: () => navigation.navigate("Pocket"),

        // User
        emailSettings: () => navigation.navigate("emailSettings"),
        settings: () => navigation.navigate("Settings"),

        // Host
        hostHomeScreen: () => navigation.navigate("HostHomeScreen"),
        hostProfile: () => navigation.navigate("HostProfile"),
        hostSettings: () => navigation.navigate("HostSettings"),
        hostHelpDesk: () => navigation.navigate("HostHelpDesk"),
        listProperty: () => navigation.navigate("ListProperty"),

        // Host Dashboard
        hostDashboard: () => navigation.navigate("HostDashboard"),
        hostCalendar: () => navigation.navigate("HostCalendar"),
        hostReviews: () => navigation.navigate("HostReviews"),
        hostPayments: () => navigation.navigate("HostPayments"),
        hostListings: () => navigation.navigate("HostListings"),

        // Host Onboarding
        landing: () => navigation.navigate("Landing"),
        onboardingHost: () => navigation.navigate("OnboardingHost"),
        reviewAndSubmitScreen: () => navigation.navigate("ReviewAndSubmitScreen"),

        // Guest
        guestDashboard: () => navigation.navigate("GuestDashboard"),
        profile: () => navigation.navigate("Profile"),
        guestBookings: () => navigation.navigate("guestBookings"),
        paymentMethods: () => navigation.navigate("PaymentMethods"),
        reviews: () => navigation.navigate("Reviews"),
        bookings: () => navigation.navigate("Bookings"),

        // Property
        detailPage: () => navigation.navigate("Detailpage"),

        // Booking Engine
        bookingProcess: () => navigation.navigate("BookingProcess"),
        simulateStripe: () => navigation.navigate("simulateStripe"),
        paymentAccepted: () => navigation.navigate("paymentAccepted"),
        paymentDeclined: () => navigation.navigate("paymentDeclined"),

        /**todo
         * Messages navigation stack
         */

        /**todo
         * Account navigation stack
         */
    };
}

export default NavigateTo;