import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/DashboardCustomizeRounded";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";

function Pages({ onNavigate }) {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);

    const handleMessagesClick = () => {
        onNavigate("Messages");
        navigate("/hostdashboard/messages");
    };
    function MenuItem({ icon, label, handleNavigation }) {
        return (
            <div className="wijzer" onClick={handleNavigation}>
                <div className="icon">{icon}</div>
                <p>{label}</p>
            </div>
        );
    }

    return (
        <div className="guest-pages">
            <button className="hamburger-btn" onClick={() => setIsOpen(!isOpen)}>
                <MenuIcon />
            </button>
            <div className={`sidebar ${isOpen ? 'open' : ''}`}>
                <button className="close-sidebar-btn" onClick={() => setIsOpen(false)}>
                    <CloseIcon />
                </button>
                <div className="menu-content">
                    <div className="dashboard-sections">
                        <MenuItem icon={<DashboardIcon />} label="Dashboard" handleNavigation={() => onNavigate("Dashboard")} />
                        <MenuItem icon={<DashboardIcon />} label="Calender" handleNavigation={() => onNavigate("Calender")} />
                        <MenuItem icon={<DashboardIcon />} label="Reservations" handleNavigation={() => onNavigate("Reservations")} />
                        <MenuItem icon={<DashboardIcon />} label="Messages" handleNavigation={handleMessagesClick} />
                        <MenuItem icon={<DashboardIcon />} label="Revenues" handleNavigation={() => onNavigate("Revenues")} />
                        <MenuItem icon={<DashboardIcon />} label="Housekeeping" handleNavigation={() => onNavigate("Housekeeping")} />
                        <MenuItem icon={<DashboardIcon />} label="Finance" handleNavigation={() => onNavigate("Finance")} />
                        <MenuItem icon={<DashboardIcon />} label="Pricing" handleNavigation={() => onNavigate("Pricing")} />
                        <MenuItem icon={<DashboardIcon />} label="Listing" handleNavigation={() => onNavigate("Listing")} />
                        <MenuItem icon={<DashboardIcon />} label="Settings" handleNavigation={() => onNavigate("Settings")} />
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
