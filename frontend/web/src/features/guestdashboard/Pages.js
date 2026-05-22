import React, { useEffect, useState, useRef, useContext } from "react";
import { NavLink, useLocation } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/DashboardCustomizeRounded";
import BookingIcon from "@mui/icons-material/LanguageOutlined";
import MessageIcon from "@mui/icons-material/QuestionAnswerOutlined";
import WishlistIcon from "@mui/icons-material/Favorite";
import Settings from "@mui/icons-material/Settings";
// import ReviewsOutlinedIcon from "@mui/icons-material/ReviewsOutlined";
import { LanguageContext } from "../../context/LanguageContext.js";
import en from "../../content/en.json";
import nl from "../../content/nl.json";
import de from "../../content/de.json";
import es from "../../content/es.json";

const contentByLanguage = { en, nl, de, es };

const NAV_KEYS = [
  { key: "Dashboard", tKey: "dashboard", icon: <DashboardIcon />, to: "/guestdashboard" },
  { key: "Bookings", tKey: "bookings", icon: <BookingIcon />, to: "/guestdashboard/bookings" },
  { key: "Messages", tKey: "messages", icon: <MessageIcon />, to: "/guestdashboard/messages" },
  // { key: "Reviews", tKey: "reviews", icon: <ReviewsOutlinedIcon />, to: "reviews" },
  { key: "Wishlist", tKey: "wishlist", icon: <WishlistIcon />, to: "/guestdashboard/wishlist" },
  { key: "Settings", tKey: "settings", icon: <Settings />, to: "/guestdashboard/settings" },
];

function Pages() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const btnRef = useRef(null);
  const { language } = useContext(LanguageContext);
  const t = contentByLanguage[language]?.guestdashboard;

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
      <button
        ref={btnRef}
        type="button"
        className="hamburger-btn"
        aria-label={open ? (t?.nav?.closeMenu || "Close menu") : (t?.nav?.openMenu || "Open menu")}
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
          <h2 className="sidebar-title">{t?.nav?.menu || "Menu"}</h2>

          <ul className="menu-list">
            {NAV_KEYS.map((item) => (
              <li key={item.key}>
                <NavLink
                  to={item.to}
                  end={item.to === "/guestdashboard"}
                  className={({ isActive }) =>
                    `menu-item ${isActive ? "active" : ""}`
                  }
                >
                  <span className="icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="label">{t?.nav?.[item.tKey] || item.key}</span>
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
