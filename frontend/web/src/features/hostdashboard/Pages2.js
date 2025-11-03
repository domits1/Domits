import React from "react";
import { NavLink } from "react-router-dom";
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

const NAV = [
  { key: "ListProperty", label: "List your property", icon: <AddIcon />,            to: "/hostonboarding" },
  { key: "Dashboard",    label: "Dashboard",         icon: <DashboardIcon />,       to: "." },
  { key: "Calendar",     label: "Calendar",          icon: <CalendarIcon />,        to: "calendar" },
  { key: "Reservations", label: "Reservations",      icon: <EventIcon />,           to: "reservations" },
  { key: "Messages",     label: "Messages",          icon: <MessageIcon />,         to: "messages" },
  { key: "Revenues",     label: "Revenues",          icon: <ShowChartIcon />,       to: "revenues" },
  { key: "Housekeeping", label: "Housekeeping",      icon: <CleaningServicesIcon />,to: "housekeeping" },
  { key: "Finance",      label: "Finance",           icon: <CreditCardIcon />,      to: "finance" },
  { key: "Pricing",      label: "Pricing",           icon: <PriceChangeIcon />,     to: "pricing" },
  { key: "Listings",     label: "Listings",          icon: <HomeIcon />,            to: "listings" },
  { key: "Settings",     label: "Settings",          icon: <SettingsIcon />,        to: "settings" },
];

function Pages({ onNavigate }) {
  return (
    <nav className="sidebar" aria-label="Host navigation" id="host-menu">
      <div className="menu-content">
        <h2 className="sidebar-title">Menu</h2>
        <ul className="menu-list">
          {NAV.map((item) => (
            <li key={item.key}>
              <NavLink
                to={item.to}
                end={item.to === "."}
                onClick={() => onNavigate?.(item.key)}
                className={({ isActive }) => `menu-item ${isActive ? "active" : ""}`}
              >
                <span className="icon" aria-hidden="true">{item.icon}</span>
                <span className="label">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

export default Pages;
