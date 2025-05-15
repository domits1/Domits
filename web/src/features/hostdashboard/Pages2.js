import { useState } from "react";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";

function Pages() {
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
        <div className="host-pages">
            <button className="hamburger-btn" onClick={toggleSidebar}>
                {isOpen ? <CloseIcon /> : <MenuIcon />}
            </button>

            <div className={`sidebar ${isOpen ? "open" : ""}`}>
                <button className="close-sidebar-btn" onClick={toggleSidebar}>
                    <CloseIcon />
                </button>
                <div className="menu-content">
                    <div className="dashboard-sections">
                    </div>
                </div>
            </div>
        </div>
    );
}