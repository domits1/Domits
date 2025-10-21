import React from "react";
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
import { useState } from "react";
import "./styles/onboardingHost.scss";

function OnboardingLayout({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setIsOpen((prev) => !prev);
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <div className="main-dashboard-guest">
      <div className="main-dashboard-sidebar">
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
                <MenuItem 
                  icon={<AddIcon />} 
                  label="List your property" 
                  active={true} 
                  onClick={() => {}} 
                />
                <MenuItem 
                  icon={<DashboardIcon />} 
                  label="Dashboard" 
                  active={false} 
                  onClick={() => handleNavigation("/hostdashboard")} 
                />
                <MenuItem 
                  icon={<CalendarIcon />} 
                  label="Calendar" 
                  active={false} 
                  onClick={() => handleNavigation("/hostdashboard/calendar")} 
                />
                <MenuItem 
                  icon={<EventIcon />} 
                  label="Reservations" 
                  active={false} 
                  onClick={() => handleNavigation("/hostdashboard/reservations")} 
                />
                <MenuItem 
                  icon={<MessageIcon />} 
                  label="Messages" 
                  active={false} 
                  onClick={() => handleNavigation("/hostdashboard/messages")} 
                />
                <MenuItem 
                  icon={<ShowChartIcon />} 
                  label="Revenues" 
                  active={false} 
                  onClick={() => handleNavigation("/hostdashboard/revenues")} 
                />
                <MenuItem 
                  icon={<CleaningServicesIcon />} 
                  label="Housekeeping" 
                  active={false} 
                  onClick={() => handleNavigation("/hostdashboard/housekeeping")} 
                />
                <MenuItem 
                  icon={<CreditCardIcon />} 
                  label="Finance" 
                  active={false} 
                  onClick={() => handleNavigation("/hostdashboard/finance")} 
                />
                <MenuItem 
                  icon={<PriceChangeIcon />} 
                  label="Pricing" 
                  active={false} 
                  onClick={() => handleNavigation("/hostdashboard/pricing")} 
                />
                <MenuItem 
                  icon={<HomeIcon />} 
                  label="Listing" 
                  active={false} 
                  onClick={() => handleNavigation("/hostdashboard/listing")} 
                />
                <MenuItem 
                  icon={<SettingsIcon />} 
                  label="Settings" 
                  active={false} 
                  onClick={() => handleNavigation("/hostdashboard/settings")} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="main-dashboard-content">
        {children}
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

export default OnboardingLayout;
