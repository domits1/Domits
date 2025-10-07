import { useState } from "react";
import Pages from "./Pages2";
import { useNavigate } from "react-router-dom";
import HostDashboard from "./HostDashboard";
import HostCalendar from "./HostCalendar";
import HostReservations from "./HostReservations";
import HostReports from "./HostPayments";
import HostPropertyCare from "./Housekeeping";
import HostFinanceTab from "./HostFinanceTab";
import HostPricing from "./hostpricing/views/HostPricing";
import HostListings from "./HostListings";
import HostSettings from "./HostSettings";

function MainDashboardHost(){
    const [activeComponent, setActiveComponent] = useState("Dashboard");
    const navigate = useNavigate();

    function renderComponent(){
        switch (activeComponent){
            case "List":
                return
            case "Dashboard":
                return <HostDashboard/>
            case "Calender":
                return <HostCalendar/>
            case "Reservations":
                return <HostReservations/>
            
            case "Revenues":
                return <HostReports/>
            case "Housekeeping":
                return <HostPropertyCare/>
            case "Finance":
                return <HostFinanceTab/>
            case "Pricing":
                return <HostPricing/>
            case "Listing":
                return <HostListings/>
            case "Settings":
                return <HostSettings/>
        }
    }

    const handleNavigation = (componentName) => {
        if (componentName === "Messages") {
            navigate('/host/messages');
            return;
        }
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