/**
 * Navigation helper functions to navigate to screens.
 *
 * React Navigation uses strings to navigate screens, making navigations difficult to find and maintain.
 *
 * @param navigation - Navigation hook from component.
 * @param parameters - Extra parameters to be given in the navigation.
 * @returns - A function to navigate to a screen.
 * @constructor
 */
const NavigateTo = (navigation, parameters) => {
    if (!navigation) {
        throw new Error("Navigation parameter is required");
    }

    return {
        // General
        homeScreen: () => navigation.navigate("HomeScreen"),
        helpAndFeedback: () => navigation.navigate("HelpAndFeedback"),

        // Home features
        scan: () => navigation.navigate("Scan"),
        pay: () => navigation.navigate("Pay"),
        pocket: () => navigation.navigate("Pocket"),

        // Account
        emailSettings: () => navigation.navigate("emailSettings"),
        settings: () => navigation.navigate("Settings"),
        loginScreen: () => navigation.navigate("Login"),
        registerScreen: () => navigation.navigate("Register"),
        confirmEmailScreen: () => navigation.navigate("ConfirmEmail"),
        accountScreen: () => navigation.navigate("AccountScreen"),

        // Host
        hostProfile: () => navigation.navigate("HostProfile"),
        hostHomeScreen: () => navigation.navigate("HostHomeScreen"),
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
        guestProfile: () => navigation.navigate("GuestProfile"),
        guestDashboard: () => navigation.navigate("GuestDashboard"),
        profile: () => navigation.navigate("Profile"),
        guestBookings: () => navigation.navigate("guestBookings"),
        paymentMethods: () => navigation.navigate("PaymentMethods"),
        reviews: () => navigation.navigate("Reviews"),
        bookings: () => navigation.navigate("Bookings"),

        // Property
        detailPage: () => navigation.navigate("Detailpage", parameters),

        // Booking Engine
        bookingProcess: () => navigation.navigate("BookingProcess", parameters),
        simulateStripe: () => navigation.navigate("simulateStripe"),
        paymentAccepted: () => navigation.navigate("paymentAccepted"),
        paymentDeclined: () => navigation.navigate("paymentDeclined"),

    };
}

export default NavigateTo;