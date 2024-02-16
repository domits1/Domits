import React from "react";

import dashboard from "../../images/icons/dashboard-icon.png";
import message from "../../images/icons/message-icon.png";
import payment from "../../images/icons/payment-icon.png";
import listings from "../../images/icons/listings-icon.png";
import calendar from "../../images/icons/calendar-icon.png";
import settings from "../../images/icons/settings-icon.png";
import { useNavigate } from 'react-router-dom';
import './HostHomepage.css';


function Pages() {

  const navigate = useNavigate();

  return (
    <div className="dashboardSection section-1">
      <div className="wijzer" onClick={() => navigate("/hostdashboard")}>
        <img src={dashboard} alt="Dashboard"></img>
        <p>Dashboard</p>
      </div>
      <div className="wijzer" onClick={() => navigate("/hostdashboard/messages")}>
        <img src={message} alt="Messages"></img>
        <p>Messages</p>
      </div>
      <div className="wijzer" onClick={() => navigate("/hostdashboard/payments")}>
        <img src={payment} alt="Payments"></img>
        <p>Payments</p>
      </div>
      <div className="wijzer" onClick={() => navigate("/hostdashboard/listings")}>
        <img src={listings} alt="Listing"></img>
        <p>Listing</p>
      </div>
      <div className="wijzer" onClick={() => navigate("/hostdashboard/calendar")}>
        <img src={calendar} alt="Calendar"></img>
        <p>Calendar</p>
      </div>
      <div className="wijzer" onClick={() => navigate("/hostdashboard/settings")}>
        <img src={settings} alt="Settings"></img>
        <p>Settings</p>
      </div>
    </div>
  );
}


export default Pages;