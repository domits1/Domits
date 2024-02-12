import React, { useState } from "react";
import { Dashboard, Messages, Payments, Listing, Calendar, Settings } from "./Pages"; 

import profile from "../../images/icons/profile-icon.png";
import message from "../../images/icons/message-icon.png";
import payment from "../../images/icons/payment-icon.png";
import review from "../../images/icons/star-icon.png";
import settings from "../../images/icons/settings-icon.png";

function HostDashboard() {
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
            <img src={profile} alt="Dashboard"></img>
            <p>Profile</p>
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
            <img src={review} alt="Listing"></img>
            <p>Listing</p>
          </div>
          <div className="wijzer" onClick={() => handlePageChange("Calendar")}>
            <img src={review} alt="Listing"></img>
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

export default HostDashboard;
