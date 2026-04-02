import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Pages from "./Pages";
import GuestDashboard from "./GuestDashboard";
import GuestBooking from "./GuestBooking";
import GuestPayments from "./GuestPayments";
import GuestSettings from "./GuestSettings";
import GuestWishlist from "./GuestWishlist";
import Messages from "../../components/messages/Messages";
import ReservationDetails from "./ReservationDetails";

const MainDashboardGuest = () => {
  const [activeComponent, setActiveComponent] = useState("Dashboard");
  const location = useLocation();

  useEffect(() => {
    const routeToComponentMap = {
      "/guestdashboard": "Dashboard",
      "/guestdashboard/": "Dashboard",
      "/guestdashboard/bookings": "Bookings",
      "/guestdashboard/messages": "Messages",
      "/guestdashboard/payments": "Payments",
      "/guestdashboard/settings": "Settings",
      "/guestdashboard/wishlist": "Wishlist",
    };

    if (location.pathname.startsWith("/guestdashboard/reservation/")) {
      setActiveComponent("ReservationDetails");
      return;
    }

    setActiveComponent(routeToComponentMap[location.pathname] || "Dashboard");
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


      case "Settings":
        return <GuestSettings />;

      case "Wishlist":
        return <GuestWishlist />;

      case "ReservationDetails":
        return <ReservationDetails />;

      default:
        return <GuestDashboard />;
    }
  };

  const handleNavigation = (componentName) => {
    setActiveComponent(componentName);
  };

  return (
    <div className="main-dashboard-guest">
      <div className="main-dashboard-sidebar">
        <Pages onNavigate={handleNavigation} />
      </div>
      <div className="main-dashboard-content">{renderComponent()}</div>
    </div>
  );
};

export default MainDashboardGuest;
