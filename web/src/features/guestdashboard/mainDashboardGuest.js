import React, { useState } from "react";
import Pages from "./Pages";
import GuestDashboard from "./GuestDashboard";
import GuestBooking from "./GuestBooking";
import GuestPayments from "./GuestPayments";
import GuestReviews from "./GuestReviews";
import GuestSettings from "./GuestSettings";
import GuestWishlist from "./GuestWishlist";
import Messages from "../../components/messages/Messages";

const MainDashboardGuest = () => {
  const [activeComponent, setActiveComponent] = useState("Dashboard");

  const renderComponent = () => {
    switch (activeComponent) {
      case "Dashboard":
        return <GuestDashboard />;
      case "Bookings":
        return <GuestBooking />;
      case "Messages":
        return <Messages dashboardType="guest"/>;
      case "Payments":
        return <GuestPayments />;
      case "Reviews":
        return <GuestReviews />;
      case "Settings":
        return <GuestSettings />;
      case "Wishlist":
        return <GuestWishlist />;
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
