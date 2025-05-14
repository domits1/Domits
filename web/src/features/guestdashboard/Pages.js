import React, { useEffect, useState } from "react";
import DashboardIcon from "@mui/icons-material/DashboardCustomizeRounded";
import BookingIcon from "@mui/icons-material/LanguageOutlined";
import MessageIcon from "@mui/icons-material/QuestionAnswerOutlined";
import WishlistIcon from "@mui/icons-material/Favorite";
import Settings from "@mui/icons-material/Settings";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";

function Pages({ onNavigate }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <div className="guest-pages">
      <button className="hamburger-btn" onClick={toggleSidebar}>
        {isOpen ? <CloseIcon /> : <MenuIcon />}
      </button>

      <div className={`sidebar ${isOpen ? "open" : ""}`}>
        <button className="close-sidebar-btn" onClick={toggleSidebar}>
          <CloseIcon />
        </button>
        <div className="menu-content">
          <div className="dashboard-sections">
            <MenuItem icon={<DashboardIcon />} label="Dashboard" handleNavigation={() => onNavigate("Dashboard")} />
            <MenuItem icon={<BookingIcon />} label="Bookings" handleNavigation={() => onNavigate("Bookings")} />
            <MenuItem icon={<MessageIcon />} label="Messages" handleNavigation={() => onNavigate("Messages")} />
            <MenuItem icon={<WishlistIcon />} label="Wishlist" handleNavigation={() => onNavigate("Wishlist")} />
            <MenuItem icon={<Settings />} label="Settings" handleNavigation={() => onNavigate("Settings")} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuItem({ icon, label, handleNavigation }) {
  return (
    <div className="wijzer" onClick={handleNavigation}>
      <div className="icon">{icon}</div>
      <p>{label}</p>
    </div>
  );
}

export default Pages;