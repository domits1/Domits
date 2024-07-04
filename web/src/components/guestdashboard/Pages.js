import React, { useEffect, useState } from "react";
import './guestdashboard.css';
import { useLocation, useNavigate } from 'react-router-dom';

import dashboard from "../../images/icons/dashboard-icon.png";
import message from "../../images/icons/message-icon.png";
import booking from "../../images/icons/booking-icon.png";
import payment from "../../images/icons/payment-icon.png";
import listings from "../../images/icons/listings-icon.png";
import settings from "../../images/icons/settings-icon.png";

function Pages() {
  const [activeTab, setActiveTab] = useState('/guestdashboard');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setActiveTab(location.pathname);
  }, [location.pathname]);

  return (
    <div className="dashboardSections">
      <div
        className={`wijzers ${activeTab === "/guestdashboard" ? "active" : ""}`}
        onClick={() => navigate("/guestdashboard")}
      >
        <img src={dashboard} alt="Profile"></img>
        <p>Dashboard</p>
      </div>
      <div
        className={`wijzers ${activeTab === "/guestdashboard/bookings" ? "active" : ""}`}
        onClick={() => navigate("/guestdashboard/bookings")}
      >
        <img src={booking} alt="Booking"></img>
        <p>Bookings</p>
      </div>
      <div
        className={`wijzers ${activeTab === "/guestdashboard/chat" ? "active" : ""}`}
        onClick={() => navigate("/guestdashboard/chat")}
      >
        <img src={message} alt="Messages"></img>
        <p>Messages</p>
      </div>
      <div
        className={`wijzers ${activeTab === "/guestdashboard/payments" ? "active" : ""}`}
        onClick={() => navigate("/guestdashboard/payments")}
      >
        <img src={payment} alt="Booking"></img>
        <p>Payments</p>
      </div>
      <div
        className={`wijzers ${activeTab === "/guestdashboard/reviews" ? "active" : ""}`}
        onClick={() => navigate("/guestdashboard/reviews")}
      >
        <img src={listings} alt="Listing"></img>
        <p>Reviews</p>
      </div>
      <div
        className={`wijzers ${activeTab === "/guestdashboard/settings" ? "active" : ""}`}
        onClick={() => navigate("/guestdashboard/settings")}
      >
        <img src={settings} alt="Settings"></img>
        <p>Settings</p>
      </div>
    </div>
  );
}

export default Pages;
