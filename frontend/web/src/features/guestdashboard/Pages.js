import React, { useEffect, useState, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/DashboardCustomizeRounded";
import BookingIcon from "@mui/icons-material/LanguageOutlined";
import MessageIcon from "@mui/icons-material/QuestionAnswerOutlined";
// import WishlistIcon from "@mui/icons-material/Favorite";
import Settings from "@mui/icons-material/Settings";
// import ReviewsOutlinedIcon from "@mui/icons-material/ReviewsOutlined";

const NAV = [
  { key: "Dashboard", label: "Dashboard", icon: <DashboardIcon />, to: "." },
  { key: "Bookings", label: "Bookings", icon: <BookingIcon />, to: "bookings" },
  { key: "Messages", label: "Messages", icon: <MessageIcon />, to: "messages" },

  // Work on it later
  // { key: "Reviews",  label: "Reviews",  icon: <ReviewsOutlinedIcon />, to: "reviews" },
  // { key: "Wishlist", label: "Wishlist", icon: <WishlistIcon />,        to: "wishlist" },

  { key: "Settings", label: "Settings", icon: <Settings />, to: "settings" },
];

function Pages({ onNavigate }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const btnRef = useRef(null);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {/* Toggle button: ☰ (closed) / × (open) */}
      <button
        ref={btnRef}
        type="button"
        className="hamburger-btn"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-controls="guest-menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true">{open ? "×" : "☰"}</span>
      </button>

      <div
        className={`sidebar-overlay ${open ? "open" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      <nav
        className={`sidebar ${open ? "open" : ""}`}
        aria-label="Guest navigation"
        id="guest-menu"
      >
        <div className="menu-content">
          <h2 className="sidebar-title">Menu</h2>

          <ul className="menu-list">
            {NAV.map((item) => (
              <li key={item.key}>
                <NavLink
                  to={item.to}
                  end={item.to === "."}
                  onClick={() => onNavigate?.(item.key)}
                  className={({ isActive }) =>
                    `menu-item ${isActive ? "active" : ""}`
                  }
                >
                  <span className="icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="label">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </>
  );
}

export default Pages;
