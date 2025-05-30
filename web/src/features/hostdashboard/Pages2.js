import { useState } from "react";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import DashboardIcon from "@mui/icons-material/DashboardCustomizeRounded";


function Pages({ onNavigate }) {
    const [isOpen, setIsOpen] = useState(false);

    const toggleSidebar = () => {
        setIsOpen((prev) => !prev);
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
            <button className="hamburger-btn" onClick={toggleSidebar}>
                {isOpen ? <CloseIcon /> : <MenuIcon />}
            </button>

            <div className={`sidebar ${isOpen ? "open" : ""}`}>
                <button className="close-sidebar-btn" onClick={toggleSidebar}>
                    <CloseIcon />
                </button>
                <div className="menu-content">
                    <div className="dashboard-sections">
                        <MenuItem icon={<DashboardIcon />} label="Dashboard" handleNavigation={() => onNavigate("Dashboard")} />
                        <MenuItem icon={<DashboardIcon />} label="Calender" handleNavigation={() => onNavigate("Calender")} />
                        <MenuItem icon={<DashboardIcon />} label="Messages" handleNavigation={() => onNavigate("Messages")} />
                        <MenuItem icon={<DashboardIcon />} label="Revenues" handleNavigation={() => onNavigate("Revenues")} />
                        <MenuItem icon={<DashboardIcon />} label="Housekeeping" handleNavigation={() => onNavigate("Housekeeping")} />
                        <MenuItem icon={<DashboardIcon />} label="Finance" handleNavigation={() => onNavigate("Finance")} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Pages;