import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import DashboardIcon from '@mui/icons-material/DashboardCustomizeRounded';
import CalendarIcon from '@mui/icons-material/CalendarTodayOutlined';
import ReservationIcon from '@mui/icons-material/Event';
import MessageIcon from '@mui/icons-material/QuestionAnswerOutlined';
import RevenueIcon from '@mui/icons-material/ShowChart';
import RevieuwsIcon from '@mui/icons-material/StarBorderOutlined';
import CleanIcon from '@mui/icons-material/CleaningServicesOutlined';
import FinanceIcon from '@mui/icons-material/CreditScoreOutlined';
import PriceChangeIcon from '@mui/icons-material/PriceChange';
import ListingIcon from '@mui/icons-material/OtherHousesOutlined';
import SettingsIcon from '@mui/icons-material/Settings';
import stripe from "../../images/icons/stripe-icon.png";
import spinner from "../../images/spinnner.gif";
import { Auth } from "aws-amplify";
import './HostHomepage.css';
import add from "../../images/icons/host-add.png";

function Pages() {
  const [userEmail, setUserEmail] = useState(null);
  const [cognitoUserId, setCognitoUserId] = useState(null);
  const [stripeLoginUrl, setStripeLoginUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('/hostdashboard');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setActiveTab(location.pathname);
  }, [location.pathname]);


  const handleNavigation = (value) => {
    if (value === 'stripe') {
      if (stripeLoginUrl) {
        window.location.href = stripeLoginUrl;
      } else {
        console.log("Set up payments");
      }
    } else if (value) {
      navigate(value);
    }
  }

  return (
    <main>
      <div className="host-dropdown">
        <br />
        {/*{loading ? (*/}
        {/*  <div>*/}
        {/*    <img src={spinner} alt="Loading" />*/}
        {/*  </div>*/}
        {/*) : (*/}
          <div className="dropdown-section">
            <div>
                <select onChange={(e) => handleNavigation(e.target.value)} defaultValue="Management">
                    <option disabled>Host Options</option>
                    <option value="/hostdashboard">Dashboard</option>
                    <option value="/hostdashboard/calendar">Calendar</option>
                    <option value="/hostdashboard/calendar">Reservations</option>
                    <option value="/hostdashboard/chat">Messages</option>
                    <option value="/hostdashboard/reporting">Revenues</option>
                    <option value="/hostdashboard/reviews">Reviews</option>
                    <option value="/hostdashboard/calendar">Housekeeping</option>
                    <option value="/hostdashboard/calendar">Finance</option>
                    <option value="/hostdashboard/pricing">Pricing</option>
                    <option value="/hostdashboard/listings">Listing</option>
                    <option value="/hostdashboard/settings">Settings</option>
                </select>
            </div>
              {/* <div>
              <select onChange={(e) => handleNavigation(e.target.value)} defaultValue="Growth">
                <option disabled>Growth</option>
                <option value="/hostdashboard/reservations">Reservations</option>
                <option value="/hostdashboard/revenues">Revenues</option>
                <option value="/hostdashboard/housekeeping">Housekeeping</option>
                <option value="/hostdashboard/iot-hub">IoT Hub</option>
                <option value="/hostdashboard/distribution">Distribution</option>
                <option value="/hostdashboard/monitoring">Monitoring</option>
                <option value="/hostdashboard/screening">Screening</option>
                <option value="/hostdashboard/setup">Setup</option>
                <option value="/hostdashboard/promo-codes">Promo Codes</option>
              </select>
            </div> */}
          </div>
        {/*)}*/}
      </div>
      <div className="dashboardSection section-1 host-navigation">
        <div
          className={`wijzer addAcco ${activeTab === "/enlist" ? "active" : ""}`}
          onClick={() => handleNavigation("/enlist")}
          style={{ maxWidth: 250 }}
        >
          {/* <img src={add} alt="add"></img> */}
          <div className="Mui">
          <AddIcon/></div>
          <p>List your property</p>
        </div>
        <div
          className={`wijzer ${activeTab === "/hostdashboard" ? "active" : ""}`}
          onClick={() => handleNavigation("/hostdashboard")}
        >
          <div className="Mui">
          <DashboardIcon/></div>
          <p>Dashboard</p> 
        </div>
        <div
          className={`wijzer ${activeTab === "/hostdashboard/calendar" ? "active" : ""}`}
          onClick={() => handleNavigation("/hostdashboard/calendar")}
        >
          <div className="Mui">
          <CalendarIcon/></div>
          <p>Calendar</p>
        </div>
        <div
          className={`wijzer ${activeTab === "/hostdashboard/reservations" ? "active" : ""}`}
          onClick={() => handleNavigation("/hostdashboard/reservations")}
        >
          <div className="Mui">
          <ReservationIcon/></div>
          <p>Reservations</p>
        </div>
        <div
          className={`wijzer ${activeTab === "/hostdashboard/chat" ? "active" : ""}`}
          onClick={() => handleNavigation("/hostdashboard/chat")}
        >
          <div className="Mui">
          <MessageIcon/></div>
          <p>Messages</p>
        </div>
        {/*Sommige pages zijn op het moment niet nodig (OP het MOMENT) maar voor nu houden we ze aan de kant (stefan en chant)*/}
        <div
          className={`wijzer ${activeTab === "/hostdashboard/revenues" ? "active" : ""}`}
          onClick={() => handleNavigation("/hostdashboard/revenues")}
        >
          <div className="Mui">
          <RevenueIcon/></div>
          <p>Revenues</p>
        </div>
        <div
          className={`wijzer ${activeTab === "/hostdashboard/reviews" ? "active" : ""}`}
          onClick={() => handleNavigation("/hostdashboard/reviews")}
        >

          <div className="Mui">
          <RevieuwsIcon/></div>
          <p>Reviews</p>
        </div>
        <div
          className={`wijzer ${activeTab === "/hostdashboard/housekeeping" ? "active" : ""}`}
          onClick={() => handleNavigation("/hostdashboard/housekeeping")}
        >

          <div className="Mui">
          <CleanIcon/></div>
          <p>Housekeeping</p>
        </div>
        <div
            className={`wijzer ${activeTab === "/hostdashboard/finance" ? "active" : ""}`}
            onClick={() => handleNavigation("/hostdashboard/finance")}
        >
          <div className="Mui">
          <FinanceIcon/></div>
          <p>Finance</p>
        </div>

        {/*Sommige pages zijn op het moment niet nodig (OP het MOMENT) maar voor nu houden we ze aan de kant (stefan en chant)*/}
        {/*<div*/}
        {/*  className={`wijzer ${activeTab === "/hostdashboard/iot-hub" ? "active" : ""}`}*/}
        {/*  onClick={() => handleNavigation("/hostdashboard/iot-hub")}*/}
        {/*>*/}
        {/*  <img src={dashboard} alt="Dashboard" />*/}
        {/*  <p>IoT Hub</p>*/}
        {/*</div>*/}
        <div
          className={`wijzer ${activeTab === "/hostdashboard/pricing" ? "active" : ""}`}
          onClick={() => handleNavigation("/hostdashboard/pricing")}
        >
          <div className="Mui">
          <PriceChangeIcon/></div>
          <p>Pricing</p>
        </div>
        {/*<div*/}
        {/*  className={`wijzer ${activeTab === "/hostdashboard/distribution" ? "active" : ""}`}*/}
        {/*  onClick={() => handleNavigation("/hostdashboard/distribution")}*/}
        {/*>*/}
        {/*  <img src={dashboard} alt="Dashboard" />*/}
        {/*  <p>Distribution</p>*/}
        {/*</div>*/}
        {/*<div*/}
        {/*  className={`wijzer ${activeTab === "/hostdashboard/monitoring" ? "active" : ""}`}*/}
        {/*  onClick={() => handleNavigation("/hostdashboard/monitoring")}*/}
        {/*>*/}
        {/*  <img src={dashboard} alt="Dashboard" />*/}
        {/*  <p>Monitoring</p>*/}
        {/*</div>*/}
        {/*<div*/}
        {/*  className={`wijzer ${activeTab === "/hostdashboard/screening" ? "active" : ""}`}*/}
        {/*  onClick={() => handleNavigation("/hostdashboard/screening")}*/}
        {/*>*/}
        {/*  <img src={dashboard} alt="Dashboard" />*/}
        {/*  <p>Screening</p>*/}
        {/*</div>*/}
        <br />
        <div
          className={`wijzer ${activeTab === "/hostdashboard/listings" ? "active" : ""}`}
          onClick={() => handleNavigation("/hostdashboard/listings")}
        >
          <div className="Mui">
          <ListingIcon/></div>
          <p>Listing</p>
        </div>
        <div
          className={`wijzer ${activeTab === "/hostdashboard/settings" ? "active" : ""}`}
          onClick={() => handleNavigation("/hostdashboard/settings")}
        >
          <div className="Mui">
          <SettingsIcon/></div>
          <p>Settings</p>
        </div>
        {/*Sommige pages zijn op het moment niet nodig (OP het MOMENT) maar voor nu houden we ze aan de kant (stefan en chant)*/}
        {/*<div*/}
        {/*  className={`wijzer ${activeTab === "/hostdashboard/setup" ? "active" : ""}`}*/}
        {/*  onClick={() => handleNavigation("/hostdashboard/setup")}*/}
        {/*>*/}
        {/*  <img src={dashboard} alt="Dashboard" />*/}
        {/*  <p>Setup</p>*/}
        {/*</div>*/}
        {/*<div*/}
        {/*  className={`wijzer ${activeTab === "/hostdashboard/promo-codes" ? "active" : ""}`}*/}
        {/*  onClick={() => handleNavigation("/hostdashboard/promo-codes")}*/}
        {/*>*/}
        {/*  <img src={dashboard} alt="Dashboard" />*/}
        {/*  <p>Promo codes</p>*/}
        {/*</div>*/}
        {/*commented for now and transfered it to finance tab*/}
        {/*{loading ? (*/}
        {/*  <div className="spinnerdiv">*/}
        {/*    <img className="spinner" src={spinner} alt="Loading" />*/}
        {/*  </div>*/}
        {/*) : (*/}
        {/*  <div className="wijzer-grn" onClick={handleStripeAction}>*/}
        {/*    <div className="stripe-icon-div">*/}
        {/*      <img src={stripe} className="stripe-icon" alt="Stripe" />*/}
        {/*    </div>*/}
        {/*    <p className="stripe-btn">{stripeLoginUrl ? 'Go to Stripe Dashboard' : 'Set Up Payments'}</p>*/}
        {/*  </div>*/}
        {/*)}*/}
      </div>
    </main>
  );
}

export default Pages;
