import React from "react";
import { NavLink } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/DashboardCustomizeRounded";
import BookingIcon from "@mui/icons-material/LanguageOutlined";
import MessageIcon from "@mui/icons-material/QuestionAnswerOutlined";
import WishlistIcon from "@mui/icons-material/Favorite";
import Settings from "@mui/icons-material/Settings";
import ReviewsOutlinedIcon from "@mui/icons-material/ReviewsOutlined";

const NAV = [
  { key: "Dashboard", label: "Dashboard", icon: <DashboardIcon />, to: "." },
  { key: "Bookings",  label: "Bookings",  icon: <BookingIcon />,  to: "bookings" },
  { key: "Messages",  label: "Messages",  icon: <MessageIcon />,  to: "messages" },
  { key: "Reviews",   label: "Reviews",   icon: <ReviewsOutlinedIcon />, to: "reviews" },
  { key: "Wishlist",  label: "Wishlist",  icon: <WishlistIcon />,  to: "wishlist" },
  { key: "Settings",  label: "Settings",  icon: <Settings />,      to: "settings" },
];

function Pages({ onNavigate }) {
  return (
    <nav className="sidebar" aria-label="Guest navigation" id="guest-menu">
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
