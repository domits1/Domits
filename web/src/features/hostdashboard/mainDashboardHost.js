import { useState } from "react";
import Pages from "./Pages2";
import HostDashboard from "./HostDashboard";
import HostCalendar from "./HostCalendar";
import HostMessages from "./HostMessages";
import HostRevenues from "./HostRevenues";
import HostPropertyCare from "./Housekeeping";

function MainDashboardHost(){
    const [activeComponent, setActiveComponent] = useState("Dashboard");

    function renderComponent(){
        switch (activeComponent){
            case "Dashboard":
                return <HostDashboard/>
            case "Calender":
                return <HostCalendar/>
            case "Messages":
                return <HostMessages/>
            case "Revenues":
                return <HostRevenues/>
            case "Housekeeping":
                return <HostPropertyCare/>
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
        <div className="main-dashboard-guest">
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