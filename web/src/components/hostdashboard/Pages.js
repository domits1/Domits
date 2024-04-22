import React, { useEffect, useState } from "react";
import dashboard from "../../images/icons/dashboard-icon.png";
import message from "../../images/icons/message-icon.png";
import payment from "../../images/icons/payment-icon.png";
import listings from "../../images/icons/listings-icon.png";
import calendar from "../../images/icons/calendar-icon.png";
import settings from "../../images/icons/settings-icon.png";
import stripe from "../../images/icons/stripe-icon.png";
import spinner from "../../images/spinnner.gif";
import { useNavigate } from 'react-router-dom';
import { Auth } from "aws-amplify";
import './HostHomepage.css';

function Pages() {
  const [userEmail, setUserEmail] = useState(null);
  const [stripeLoginUrl, setStripeLoginUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const setUserEmailAsync = async () => {
      try {
        const userInfo = await Auth.currentUserInfo();
        setUserEmail(userInfo.attributes.email);
        const userSub = userInfo.attributes.sub;
        const response = await fetch(`https://2n7strqc40.execute-api.eu-north-1.amazonaws.com/dev/CheckIfStripeExists`, {
          method: 'POST',
          headers: {
            'Content-type': 'application/json; charset=UTF-8',
          },
          body: JSON.stringify({ sub: userSub }),
        });
        const data = await response.json();
        if (data.hasStripeAccount) {
          setStripeLoginUrl(data.loginLinkUrl);
        }
      } catch (error) {
        console.error("Error fetching user data or Stripe status:", error);
      } finally {
        setLoading(false);
      }
    };
    setUserEmailAsync();
  }, []);

  async function handleStripeAction() {
    if (stripeLoginUrl) {
      window.open(stripeLoginUrl, '_blank');
    } else if (userEmail) {
      const options = {
        userEmail: userEmail
      };
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
    } else {
      console.error('User email is not defined.');
    }
  }

  return (
      <div className="dashboardSection section-1">
        <div className="wijzer" onClick={() => navigate("/hostdashboard")}>
          <img src={dashboard} alt="Dashboard"></img>
          <p>Dashboard</p>
        </div>
        <div className="wijzer" onClick={() => navigate("/hostdashboard/Chatprototype")}>
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
        <div className="wijzer" onClick={() => navigate("/hostdashboard/reviews")}>
          <img src={listings} alt="Reviews"></img>
          <p>Reviews</p>
        </div>
        {loading ? (
            <div className="spinnerdiv">
              <img className="spinner" src={spinner} alt="Loading"/>
            </div>
        ) : (
            <div className="wijzer-grn" onClick={handleStripeAction}>
              <div className="stripe-icon-div">
                <img src={stripe} className="stripe-icon" alt="Stripe"/>
              </div>
              <p className="stripe-btn">{stripeLoginUrl ? 'Go to Stripe Dashboard' : 'Set Up Payments'}</p>
            </div>
        )}
      </div>
  );
}

export default Pages;