import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/DashboardCustomizeRounded";
import CalendarIcon from "@mui/icons-material/CalendarToday";
import EventIcon from "@mui/icons-material/Event";
import MessageIcon from "@mui/icons-material/QuestionAnswerOutlined";
import ShowChartIcon from "@mui/icons-material/BarChart";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import CreditCardIcon from "@mui/icons-material/AccountBalanceWallet";
import PriceChangeIcon from "@mui/icons-material/PriceChange";
import HomeIcon from "@mui/icons-material/Home";
import SettingsIcon from "@mui/icons-material/Settings";
import AddIcon from "@mui/icons-material/Add";
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
            <MenuItem icon={<AddIcon />} label="List your property" active={activeLabel === "List"} onClick={() => { navigate("/hostonboarding"); }} />
            <MenuItem icon={<DashboardIcon />} label="Dashboard" active={activeLabel === "Dashboard"} onClick={() => onNavigate("Dashboard")} />
            <MenuItem icon={<CalendarIcon />} label="Calendar" active={activeLabel === "Calender"} onClick={() => onNavigate("Calender")} />
            <MenuItem icon={<EventIcon />} label="Reservations" active={activeLabel === "Reservations"} onClick={() => onNavigate("Reservations")} />
            <MenuItem icon={<MessageIcon />} label="Messages" active={activeLabel === "Messages"} onClick={() => { onNavigate("Messages"); navigate("/hostdashboard/messages"); }} />
            <MenuItem icon={<ShowChartIcon />} label="Revenues" active={activeLabel === "Revenues"} onClick={() => onNavigate("Revenues")} />
            <MenuItem icon={<CleaningServicesIcon />} label="Housekeeping" active={activeLabel === "Housekeeping"} onClick={() => onNavigate("Housekeeping")} />
            <MenuItem icon={<CreditCardIcon />} label="Finance" active={activeLabel === "Finance"} onClick={() => onNavigate("Finance")} />
            <MenuItem icon={<PriceChangeIcon />} label="Pricing" active={activeLabel === "Pricing"} onClick={() => onNavigate("Pricing")} />
            <MenuItem icon={<HomeIcon />} label="Listing" active={activeLabel === "Listing"} onClick={() => onNavigate("Listing")} />
            <MenuItem icon={<SettingsIcon />} label="Settings" active={activeLabel === "Settings"} onClick={() => onNavigate("Settings")} />
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