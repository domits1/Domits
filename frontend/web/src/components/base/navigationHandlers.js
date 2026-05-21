export const createNavigationHandlers = ({ navigate, currentView, setCurrentView, setDropdownVisible, setAppsMenuOpen }) => ({
  toggleDropdown: () => {
    setAppsMenuOpen?.(false);
    setDropdownVisible((prev) => !prev);
  },
  navigateToLogin: () => {
    navigate("/login");
  },
  navigateToRegister: () => {
    navigate("/register");
  },
  navigateToLanding: () => {
    navigate("/landing");
  },
  navigateToNinedots: () => {
    navigate("/travelinnovation");
  },
  navigateToGuestDashboard: () => {
    setCurrentView("guest");
    navigate("/guestdashboard");
  },
  navigateToHostDashboard: () => {
    setCurrentView("host");
    navigate("/hostdashboard");
  },
  navigateToMessages: () => {
    navigate(currentView === "host" ? "/hostdashboard/messages" : "/guestdashboard/messages");
  },
  navigateToPayments: () => {
    navigate("/guestdashboard/payments");
  },
  navigateToReviews: () => {
    navigate("/guestdashboard/reviews");
  },
  navigateToSettings: () => {
    navigate("/guestdashboard/settings");
  },
});
