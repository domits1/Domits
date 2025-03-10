import React, { useEffect, useState } from "react";
import './guestdashboard.css';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/DashboardCustomizeRounded';
import BookingIcon from '@mui/icons-material/LanguageOutlined';
import MessageIcon from '@mui/icons-material/QuestionAnswerOutlined';
import FinanceIcon from '@mui/icons-material/CreditScoreOutlined';
import RevieuwsIcon from '@mui/icons-material/StarBorderOutlined';
import Settings from '@mui/icons-material/Settings';

function Pages() {
  const [activeTab, setActiveTab] = useState();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setActiveTab(location.pathname);
  }, [location.pathname]);

  const handleNavigation = (value) => {
    if (value) {
      navigate(value);
    }
  }

  return (
    <main>
      <div className="guest-dropdown">
        <br />
        <div className="dropdown-section">
          <div>
            <select onChange={(e) => handleNavigation(e.target.value)} defaultValue="Guest Options">
              <option disabled>Guest Options</option>
              <option value="/guestdashboard">Dashboard</option>
              <option value="/guestdashboard/bookings">Bookings</option>
              <option value="/guestdashboard/chat">Messages</option>
              {/* <option value="/guestdashboard/payments">Payments</option> */}
              <option value="/guestdashboard/reviews">Reviews</option>
              <option value="/guestdashboard/settings">Settings</option>
            </select>
          </div>
        </div>
      </div>
      <div className="dashboardSections">
        <div
          className={`wijzers ${activeTab === "/guestdashboard" ? "active" : ""}`}
          onClick={() => navigate("/guestdashboard")}
        >
          <div className="Mui">
          <DashboardIcon/></div>
          <p>Dashboard</p>
        </div>
        <div
          className={`wijzers ${activeTab === "/guestdashboard/bookings" ? "active" : ""}`}
          onClick={() => navigate("/guestdashboard/bookings")}
        >
          <div className="Mui">
          <BookingIcon/></div>
          <p>Bookings</p>
        </div>
        <div
          className={`wijzers ${activeTab === "/guestdashboard/chat" ? "active" : ""}`}
          onClick={() => navigate("/guestdashboard/chat")}
        >
          <div className="Mui">
          <MessageIcon/></div>
          <p>Messages</p>
        </div>
        {/* <div
          className={`wijzers ${activeTab === "/guestdashboard/payments" ? "active" : ""}`}
          onClick={() => navigate("/guestdashboard/payments")}
        >
          <div className="Mui">
          <FinanceIcon/></div>
          <p>Payments</p>
        </div> */}
        <div
          className={`wijzers ${activeTab === "/guestdashboard/reviews" ? "active" : ""}`}
          onClick={() => navigate("/guestdashboard/reviews")}
        >
          <div className="Mui">
          <RevieuwsIcon/></div>
          <p>Reviews</p>
        </div>
        <div
          className={`wijzers ${activeTab === "/guestdashboard/settings" ? "active" : ""}`}
          onClick={() => navigate("/guestdashboard/settings")}
        >
          <div className="Mui">
          <Settings/></div>
          <p>Settings</p>
        </div>
      </div>
    </main>
  );
}

export default Pages;
