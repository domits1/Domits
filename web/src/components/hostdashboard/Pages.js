import React from "react";

import dashboard from "../../images/icons/dashboard-icon.png";
import message from "../../images/icons/message-icon.png";
import payment from "../../images/icons/payment-icon.png";
import listings from "../../images/icons/listings-icon.png";
import calendar from "../../images/icons/calendar-icon.png";
import settings from "../../images/icons/settings-icon.png";
import { useNavigate } from 'react-router-dom';
import { useAuth} from "../base/AuthContext"
import './HostHomepage.css';


function Pages() {

  const navigate = useNavigate();

  const userEmail = sessionStorage.getItem('userEmail');

  async function createStripeAccount() {
    if (!userEmail) {
      console.error('User email is not defined.');
      return; // Don't proceed if userEmail is undefined
  }

  const options = {
      userEmail: userEmail
  };
  
    // console.log('Attempting to create Stripe account with email:', userEmail); // Log for debugging
  
    try {
        const result = await fetch('https://zuak8serw5.execute-api.eu-north-1.amazonaws.com/dev/CreateStripeAccount', {
            method: 'POST',
            body: JSON.stringify(options),
            headers: {
                'Content-type': 'application/json; charset=UTF-8',
            },
        });
  
        if (!result.ok) {
            throw new Error(`HTTP error! Status: ${result.status}`);
        }
  
        const data = await result.json();
        window.location.replace(data.url);
    } catch (error) {
        console.log(error);
    }
  }

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
      <div className="wijzer" onClick={() => createStripeAccount()}>
        <img src={settings} alt="Settings"></img>
        <p>Create Stripe Account</p>
      </div>
    </div>
  );
}


export default Pages;