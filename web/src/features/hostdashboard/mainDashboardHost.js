import { useState } from "react";
import Pages from "./pages2";


function MainDashboardHost(){
    const [activeComponent, setActiveComponent] = useState("Dashboard");

    function renderComponent(){
        switch (activeComponent){
            case "Dashboard":
                return
            case "Calender":
                return
            case "Messages":
                return
            case "Revenues":
                return
            case "Housekeeping":
                return
            case "Finance":
                return
            case "Pricing":
                return
            case "Listing":
                return
            case "Settings":
                return
        }
    }

    const handleNavigation = (componentName) => {
        setActiveComponent(componentName);
    };

    return (
        <div className="main-dashboard-host">
            <div className="main-dashboard-sidebar">
                <Pages onNavigate={handleNavigation} />
            </div>
            <div className="main-dashboard-content">
                {renderComponent()}
            </div>
        </div>
    );
}

export default MainDashboardHost