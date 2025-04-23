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
        home: () => navigation.navigate("home"),
        helpAndFeedback: () => navigation.navigate("help-and-feedback"),

        // Home features
        scan: () => navigation.navigate("scan"),
        pay: () => navigation.navigate("pay"),
        pocket: () => navigation.navigate("pocket"),

        // Account
        login: () => navigation.navigate("login"),
        register: () => navigation.navigate("register"),
        account: () => navigation.navigate("account"),

        // Account Settings
        hostAccountSettings: () => navigation.navigate("host-account-settings"),
        guestAccountSettings: () => navigation.navigate("guest-account-settings"),
        changeAccountSettings: () => navigation.navigate("change-account-settings"),
        confirmEmail: () => navigation.navigate("confirm-email"),

        // Host
        hostHome: () => navigation.navigate("host-home"),
        hostProfile: () => navigation.navigate("host-profile"),
        hostHelpDesk: () => navigation.navigate("host-help-desk"),
        hostListings: () => navigation.navigate("host-listings"),

        // Host Dashboard
        hostDashboard: () => navigation.navigate("host-dashboard"),
        hostCalendar: () => navigation.navigate("host-calendar"),
        hostReviews: () => navigation.navigate("host-reviews"),
        hostPayments: () => navigation.navigate("host-payments"),

        // Host Onboarding
        hostOnboardingLanding: () => navigation.navigate("host-onboarding-landing"),
        hostOnboarding: () => navigation.navigate("host-onboarding"),
        hostReviewPropertyChanges: () => navigation.navigate("host-review-property-changes", parameters),

        // Guest
        guestDashboard: () => navigation.navigate("guest-dashboard"),
        guestProfile: () => navigation.navigate("guest-profile"),
        guestPaymentMethods: () => navigation.navigate("guest-payment-methods"),
        guestReviews: () => navigation.navigate("guest-reviews"),
        guestBookings: () => navigation.navigate("guest-bookings"),

        // Property
        propertyDetails: () => navigation.navigate("property-details", parameters),

        // Booking Engine
        bookingProcess: () => navigation.navigate("booking-process", parameters),
        simulateStripe: () => navigation.navigate("simulate-stripe", parameters),
        paymentAccepted: () => navigation.navigate("payment-accepted", parameters),
        paymentDeclined: () => navigation.navigate("payment-declined", parameters),
        guestNewConfirmedBooking: () => navigation.navigate("guest-new-confirmed-booking", parameters),

    };
}

export default NavigateTo;