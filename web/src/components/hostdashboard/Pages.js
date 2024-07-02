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
import add from "../../images/icons/host-add.png";

function Pages() {
  const [userEmail, setUserEmail] = useState(null);
  const [cognitoUserId, setCognitoUserId] = useState(null);
  const [stripeLoginUrl, setStripeLoginUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const setUserEmailAsync = async () => {
      try {
        const userInfo = await Auth.currentUserInfo();
        setUserEmail(userInfo.attributes.email);
        setCognitoUserId(userInfo.attributes.sub);
        const response = await fetch(`https://2n7strqc40.execute-api.eu-north-1.amazonaws.com/dev/CheckIfStripeExists`, {
          method: 'POST',
          headers: {
            'Content-type': 'application/json; charset=UTF-8',
          },
          body: JSON.stringify({ sub: userInfo.attributes.sub }),
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
    } else if (userEmail && cognitoUserId) {
      const options = {
        userEmail: userEmail,
        cognitoUserId: cognitoUserId
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
      console.error('User email or cognitoUserId is not defined.');
    }
  }
    const handleNavigation = (event) => {
        const value = event.target.value;
        if (value === 'stripe') {
            // Special case for Stripe
            if (stripeLoginUrl) {
                window.location.href = stripeLoginUrl; // Redirect to Stripe dashboard
            } else {
                // Assume some setup method if no URL
                console.log("Set up payments");
            }
        } else if (value) {
            navigate(value);
        }
    }

  return (
      <main>
          <div className="host-dropdown">
              <br/>
              {loading ? (
                  <div>
                      <img src={spinner} alt="Loading"/>
                  </div>
              ) : (
                  <div className="dropdown-section">
                      <div>
                          <select onChange={handleNavigation} defaultValue="Management">
                              <option disabled>Management</option>
                              <option value="/hostdashboard">Dashboard</option>
                              <option value="/hostdashboard/calendar">Calendar</option>
                              <option value="/hostdashboard/chat">Messages</option>
                              <option value="/hostdashboard/reporting">Reporting</option>
                              <option value="/hostdashboard/reviews">Reviews</option>
                              <option value="/hostdashboard/listings">Listing</option>
                              <option value="/hostdashboard/settings">Settings</option>
                          </select>
                      </div>

                      <div>
                          <select onChange={handleNavigation} defaultValue="Growth">
                              <option disabled>Growth</option>
                              <option value="/hostdashboard/reservations">Reservations</option>
                              <option value="/hostdashboard/revenues">Revenues</option>
                              <option value="/hostdashboard/property-care">Property Care</option>
                              <option value="/hostdashboard/iot-hub">IoT Hub</option>
                              <option value="/hostdashboard/pricing">Pricing</option>
                              <option value="/hostdashboard/distribution">Distribution</option>
                              <option value="/hostdashboard/monitoring">Monitoring</option>
                              <option value="/hostdashboard/screening">Screening</option>
                              <option value="/hostdashboard/setup">Setup</option>
                              <option value="/hostdashboard/promo-codes">Promo Codes</option>
                              <option value="/hostdashboard/occupancy">Occupancy/ADR</option>
                          </select>
                      </div>
                  </div>
              )}
          </div>
          <div className="dashboardSection section-1 host-navigation">
              <div className="wijzer addAcco" onClick={() => navigate("/enlist")} style={{maxWidth: 250,}}>
                  <img src={add} alt="add"></img>
                  <p>Add new accommodation</p>
              </div>
              <div className="wijzer" onClick={() => navigate("/hostdashboard")}>
                  <img src={dashboard} alt="Dashboard"></img>
                  <p>Dashboard</p>
              </div>
              <div className="wijzer" onClick={() => navigate("/hostdashboard/calendar")}>
                  <img src={calendar} alt="Calendar"></img>
                  <p>Calendar</p>
              </div>
              <div className="wijzer" onClick={() => navigate("/hostdashboard/reservations")}>
                  <img src={dashboard} alt="Dashboard"/>
                  <p>Reservations</p>
              </div>
              <div className="wijzer" onClick={() => navigate("/hostdashboard/chat")}>
                  <img src={message} alt="Messages"></img>
                  <p>Messages</p>
              </div>
              <div className="wijzer" onClick={() => navigate("/hostdashboard/revenues")}>
                  <img src={dashboard} alt="Dashboard"/>
                  <p>Revenues</p>
              </div>
              <div className="wijzer" onClick={() => navigate("/hostdashboard/reporting")}>
                  <img src={payment} alt="Payments"></img>
                  <p>Reporting</p>
              </div>
              <div className="wijzer" onClick={() => navigate("/hostdashboard/occupancy")}>
                  <img src={dashboard} alt="Dashboard"/>
                  <p>Occupancy/ADR</p>
              </div>
              <div className="wijzer" onClick={() => navigate("/hostdashboard/reviews")}>
                  <img src={listings} alt="Reviews"></img>
                  <p>Reviews</p>
              </div>
              <div className="wijzer" onClick={() => navigate("/hostdashboard/property-care")}>
                  <img src={dashboard} alt="Dashboard"/>
                  <p>Property care</p>
              </div>
              <div className="wijzer" onClick={() => navigate("/hostdashboard/iot-hub")}>
                  <img src={dashboard} alt="Dashboard"/>
                  <p>IoT Hub</p>
              </div>
              <div className="wijzer" onClick={() => navigate("/hostdashboard/pricing")}>
                  <img src={dashboard} alt="Dashboard"/>
                  <p>Pricing</p>
              </div>
              <div className="wijzer" onClick={() => navigate("/hostdashboard/distribution")}>
                  <img src={dashboard} alt="Dashboard"/>
                  <p>Distribution</p>
              </div>
              <div className="wijzer" onClick={() => navigate("/hostdashboard/monitoring")}>
                  <img src={dashboard} alt="Dashboard"/>
                  <p>Monitoring</p>
              </div>
              <div className="wijzer" onClick={() => navigate("/hostdashboard/screening")}>
                  <img src={dashboard} alt="Dashboard"/>
                  <p>Screening</p>
              </div>
              <br/>
              <div className="wijzer" onClick={() => navigate("/hostdashboard/listings")}>
                  <img src={listings} alt="Listing"></img>
                  <p>Listing</p>
              </div>
              <div className="wijzer" onClick={() => navigate("/hostdashboard/settings")}>
                  <img src={settings} alt="Settings"></img>
                  <p>Settings</p>
              </div>
              <div className="wijzer" onClick={() => navigate("/hostdashboard/setup")}>
                  <img src={dashboard} alt="Dashboard"/>
                  <p>Setup</p>
              </div>
              <div className="wijzer" onClick={() => navigate("/hostdashboard/promo-codes")}>
                  <img src={dashboard} alt="Dashboard"/>
                  <p>Promo codes</p>
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
      </main>
  );
}

export default Pages;