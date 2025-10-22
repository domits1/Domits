import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import DashboardIcon from "@mui/icons-material/DashboardCustomizeRounded";

function Pages() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const toggleSidebar = () => setIsOpen((prev) => !prev);
  const closeAnd = (fn) => () => {
    fn();
    setIsOpen(false);
  };

  const items = [
    { label: "List your property", to: "/hostonboarding" },
    { label: "Dashboard", to: "." },
    { label: "Calendar", to: "calendar" },
    { label: "Reservations", to: "reservations" },
    { label: "Messages", to: "messages" },
    { label: "Revenues", to: "revenues" },
    { label: "Housekeeping", to: "housekeeping" },
    { label: "Finance", to: "finance" },
    { label: "Pricing", to: "pricing" },
    { label: "Listings", to: "listings" },
    { label: "Settings", to: "settings" },
  ];

  return (
    <div className="guest-pages">
      <button className="hamburger-btn" onClick={toggleSidebar} aria-label="Open menu">
        {isOpen ? <CloseIcon /> : <MenuIcon />}
      </button>

      <div className={`sidebar ${isOpen ? "open" : ""}`}>
        <button className="close-sidebar-btn" onClick={toggleSidebar} aria-label="Close menu">
          <CloseIcon />
        </button>

        <div className="menu-content">
          <div className="dashboard-sections">
            {items.map(({ label, to, absolute }) => {
              if (absolute) {
                return (
                  <button key={label} type="button" className="wijzer" onClick={closeAnd(() => navigate(to))}>
                    <div className="icon">
                      <DashboardIcon />
                    </div>
                    <p>{label}</p>
                  </button>
                );
              }

              return (
                <NavLink
                  key={label}
                  to={to}
                  end={to === "."}
                  className={({ isActive }) => `wijzer ${isActive ? "active" : ""}`}
                  onClick={() => setIsOpen(false)}>
                  <div className="icon">
                    <DashboardIcon />
                  </div>
                  <p>{label}</p>
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Pages;
