import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/DashboardCustomizeRounded";
import CalendarIcon from "@mui/icons-material/CalendarToday";
import BookingIcon from "@mui/icons-material/Assignment";
import MessageIcon from "@mui/icons-material/QuestionAnswerOutlined";
import RevenueIcon from "@mui/icons-material/BarChart";
import HousekeepingIcon from "@mui/icons-material/CleaningServices";
import FinanceIcon from "@mui/icons-material/AccountBalanceWallet";
import PricingIcon from "@mui/icons-material/PriceChange";
import WishlistIcon from "@mui/icons-material/Favorite";
import Settings from "@mui/icons-material/Settings";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";

function Pages({ onNavigate, activeLabel }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

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
            <MenuItem icon={<DashboardIcon />} label="Dashboard" active={activeLabel === "Dashboard"} onClick={() => onNavigate("Dashboard")} />
            <MenuItem icon={<CalendarIcon />} label="Calendar" active={activeLabel === "Calendar"} onClick={() => onNavigate("Calendar")} />
            <MenuItem icon={<BookingIcon />} label="Reservations" active={activeLabel === "Bookings"} onClick={() => onNavigate("Bookings")} />
            <MenuItem icon={<MessageIcon />} label="Messages" active={activeLabel === "Messages"} onClick={() => { onNavigate("Messages"); navigate("/guestdashboard/messages"); }} />
            <MenuItem icon={<RevenueIcon />} label="Revenues" active={activeLabel === "Revenues"} onClick={() => onNavigate("Revenues")} />
            <MenuItem icon={<HousekeepingIcon />} label="Housekeeping" active={activeLabel === "Housekeeping"} onClick={() => onNavigate("Housekeeping")} />
            <MenuItem icon={<FinanceIcon />} label="Finance" active={activeLabel === "Finance"} onClick={() => onNavigate("Finance")} />
            <MenuItem icon={<PricingIcon />} label="Pricing" active={activeLabel === "Pricing"} onClick={() => onNavigate("Pricing")} />
            <MenuItem icon={<WishlistIcon />} label="Listings" active={activeLabel === "Listings"} onClick={() => onNavigate("Listings")} />
            <MenuItem icon={<Settings />} label="Settings" active={activeLabel === "Settings"} onClick={() => onNavigate("Settings")} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuItem({ icon, label, active, onClick }) {
  return (
    <div className={`wijzer ${active ? "active" : ""}`} onClick={onClick}>
      <div className="icon">{icon}</div>
      <p>{label}</p>
    </div>
  );
}

export default Pages;