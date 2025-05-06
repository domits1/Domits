import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/DashboardCustomizeRounded';
import BookingIcon from '@mui/icons-material/LanguageOutlined';
import MessageIcon from '@mui/icons-material/QuestionAnswerOutlined';
import WishlistIcon from '@mui/icons-material/Favorite';
import Settings from '@mui/icons-material/Settings';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';

function Pages() {
  const [activeTab, setActiveTab] = useState();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setActiveTab(location.pathname);
  }, [location.pathname]);

  const handleNavigation = (value) => {
    navigate(value);
    setIsOpen(false);
  };

  return (
    <main className="guest-pages">
      <button className="hamburger-btn" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <CloseIcon /> : <MenuIcon />}
      </button>

      {isOpen && (
        <div className="menu-content">
          <select onChange={(e) => handleNavigation(e.target.value)} defaultValue="Guest Options">
            <option disabled>Guest Options</option>
            <option value="/guestdashboard">Dashboard</option>
            <option value="/guestdashboard/wishlist">Wishlist</option>
            <option value="/guestdashboard/bookings">Bookings</option>
            <option value="/guestdashboard/chat">Messages</option>
            <option value="/guestdashboard/settings">Settings</option>
          </select>

          <div className="dashboard-sections">
            <MenuItem icon={<DashboardIcon />} path="/guestdashboard" label="Dashboard" activeTab={activeTab} handleNavigation={handleNavigation} />
            <MenuItem icon={<BookingIcon />} path="/guestdashboard/bookings" label="Bookings" activeTab={activeTab} handleNavigation={handleNavigation} />
            <MenuItem icon={<MessageIcon />} path="/guestdashboard/chat" label="Messages" activeTab={activeTab} handleNavigation={handleNavigation} />
            <MenuItem icon={<WishlistIcon />} path="/guestdashboard/Wishlist" label="Wishlist" activeTab={activeTab} handleNavigation={handleNavigation} />
            <MenuItem icon={<Settings />} path="/guestdashboard/settings" label="Settings" activeTab={activeTab} handleNavigation={handleNavigation} />
          </div>
        </div>
      )}
    </main>
  );
}

function MenuItem({ icon, path, label, activeTab, handleNavigation }) {
  return (
    <div
      className={`wijzer ${activeTab === path ? "active" : ""}`}
      onClick={() => handleNavigation(path)}
    >
      <div className="icon">{icon}</div>
      <p>{label}</p>
    </div>
  );
}

export default Pages;
