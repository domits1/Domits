import React, { useState } from "react";
import { Dashboard, Messages, Payments, Listing, Calendar, Settings } from "./Pages"; 

import dashboard from "../../images/icons/dashboard-icon.png";
import message from "../../images/icons/message-icon.png";
import payment from "../../images/icons/payment-icon.png";
import listings from "../../images/icons/listings-icon.png";
import calendar from "../../images/icons/calendar-icon.png";
import settings from "../../images/icons/settings-icon.png";
import './HostHomepage.css'

function HostHomepage() {
  const [selectedPage, setSelectedPage] = useState("Dashboard");

  const handlePageChange = (page) => {
    setSelectedPage(page);
  };

  return (
    <div className="container">
      <h2>Dashboard</h2>
      <div className="dashboard">
        <div className="dashboardSection section-1">
          <div className="wijzer" onClick={() => handlePageChange("Dashboard")}>
            <img src={dashboard} alt="Dashboard"></img>
            <p>Dashboard</p>
          </div>
          <div className="wijzer" onClick={() => handlePageChange("Messages")}>
            <img src={message} alt="Messages"></img>
            <p>Messages</p>
          </div>
          <div className="wijzer" onClick={() => handlePageChange("Payments")}>
            <img src={payment} alt="Payments"></img>
            <p>Payments</p>
          </div>
          <div className="wijzer" onClick={() => handlePageChange("Listing")}>
            <img src={listings} alt="Listing"></img>
            <p>Listing</p>
          </div>
          <div className="wijzer" onClick={() => handlePageChange("Calendar")}>
            <img src={calendar} alt="Calendar"></img>
            <p>Calendar</p>
          </div>
          <div className="wijzer" onClick={() => handlePageChange("Settings")}>
            <img src={settings} alt="Settings"></img>
            <p>Settings</p>
          </div>
        </div>

        {/* Render the selected page dynamically */}
        {selectedPage === "Dashboard" && <Dashboard />}
        {selectedPage === "Messages" && <Messages />}
        {selectedPage === "Payments" && <Payments />}
        {selectedPage === "Listing" && <Listing />}
        {selectedPage === "Calendar" && <Calendar />}
        {selectedPage === "Settings" && <Settings />}
      </div>
    </div>
  );
}

export default HostHomepage;
