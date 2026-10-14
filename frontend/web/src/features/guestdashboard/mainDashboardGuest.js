import React, { useMemo } from "react";
import { useLocation } from "react-router-dom";
import Pages from "./Pages";
import GuestDashboard from "./GuestDashboard";
import GuestBooking from "./GuestBooking";
import GuestPayments from "./GuestPayments";
import GuestSettings from "./GuestSettings";
import GuestSettingsHub from "./GuestSettingsHub";
import GuestCommunicationPreferences from "./GuestCommunicationPreferences";
import GuestWishlist from "./GuestWishlist";
import Messages from "../../components/messages/Messages";
import ReservationDetails from "./ReservationDetails";
import InquiryPaymentPage from "./InquiryPaymentPage";

const MainDashboardGuest = () => {
  const location = useLocation();

  const activeComponent = useMemo(() => {
    const routeToComponentMap = {
      "/guestdashboard": "Dashboard",
      "/guestdashboard/": "Dashboard",
      "/guestdashboard/bookings": "Bookings",
      "/guestdashboard/messages": "Messages",
      "/guestdashboard/payments": "Payments",
      "/guestdashboard/settings": "SettingsHub",
      "/guestdashboard/settings/personal-data": "Settings",
      "/guestdashboard/settings/communication-preferences": "CommunicationPreferences",
      "/guestdashboard/wishlist": "Wishlist",
    };

    if (location.pathname.startsWith("/guestdashboard/reservation/")) {
      return "ReservationDetails";
    }
    if (location.pathname.startsWith("/guestdashboard/pay/")) {
      return "InquiryPayment";
    }

    return routeToComponentMap[location.pathname] || "Dashboard";
  }, [location.pathname]);

  const renderComponent = () => {
    switch (activeComponent) {
      case "Dashboard":
        return <GuestDashboard />;
      case "Bookings":
        return <GuestBooking />;
      case "Messages":
        return <Messages dashboardType="guest" />;
      case "Payments":
        return <GuestPayments />;

      case "SettingsHub":
        return <GuestSettingsHub />;

      case "Settings":
        return <GuestSettings />;

      case "CommunicationPreferences":
        return <GuestCommunicationPreferences />;

      case "Wishlist":
        return <GuestWishlist />;

      case "ReservationDetails":
        return <ReservationDetails />;
      case "InquiryPayment":
        return <InquiryPaymentPage />;

      default:
        return <GuestDashboard />;
    }
  };

  return (
    <div className="main-dashboard-guest">
      <div className="main-dashboard-sidebar">
        <Pages />
      </div>
      <div className="main-dashboard-content">{renderComponent()}</div>
    </div>
  );
};

export default MainDashboardGuest;
