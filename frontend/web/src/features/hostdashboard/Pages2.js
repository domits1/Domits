<<<<<<< Updated upstream
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
=======
import React from "react";
import { useNavigate } from "react-router-dom";
>>>>>>> Stashed changes
import DashboardIcon from "@mui/icons-material/DashboardCustomizeRounded";

function Pages({ onNavigate }) {
<<<<<<< Updated upstream
    const [isOpen, setIsOpen] = useState(false);
=======
>>>>>>> Stashed changes
    const navigate = useNavigate();

    const handleMessagesClick = () => {
        onNavigate("Messages");
        navigate("/hostdashboard/messages");
    };

<<<<<<< Updated upstream
    const handleMessagesClick = () => {
        navigate('/hostdashboard/messages');
    };


=======
>>>>>>> Stashed changes
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
            <div className="sidebar">
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
                </div>
            </div>
        </div>
    );
}

export default Pages;