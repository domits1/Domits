import React from "react";
import './guestdashboard.css';

import dashboard from "../../images/icons/dashboard-icon.png";
import message from "../../images/icons/message-icon.png";
import payment from "../../images/icons/payment-icon.png";
import listings from "../../images/icons/listings-icon.png";
import settings from "../../images/icons/settings-icon.png";
import { useNavigate } from 'react-router-dom';


function Pages() {

  const navigate = useNavigate();

  return (
    <div className="dashboardSections">
      <div className="wijzers" onClick={() => navigate("/guestdashboard")}>
        <img src={dashboard} alt="Profile"></img>
        <p>Dashboard</p>
      </div>
      <div className="wijzers" onClick={() => navigate("/guestdashboard/Chat")}>
        <img src={message} alt="Messages"></img>
        <p>Messages</p>
      </div>
      {/* <div className="wijzers" onClick={() => navigate("/guestdashboard/payments")}>
        <img src={payment} alt="Payments"></img>
        <p>Payments</p>
      </div> */}
      <div className="wijzers" onClick={() => navigate("/guestdashboard/reviews")}>
        <img src={listings} alt="Listing"></img>
        <p>Reviews</p>
      </div>
      <div className="wijzers" onClick={() => navigate("/guestdashboard/settings")}>
        <img src={settings} alt="Settings"></img>
        <p>Settings</p>
      </div>
    </div>
  );
}


export default Pages;