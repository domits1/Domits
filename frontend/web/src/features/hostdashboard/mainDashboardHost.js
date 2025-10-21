import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import "./Sidebar.scss";
import Pages from "./Pages2";
import HostDashboard from "./HostDashboard";
import HostCalendar from "./HostCalendar";
import HostReservations from "./HostReservations";
import Messages from "../../components/messages/Messages";
import HostReports from "./HostPayments";
import HostPropertyCare from "./Housekeeping";
import HostFinanceTab from "./HostFinanceTab";
import HostPricing from "./hostpricing/views/HostPricing";
import HostListings from "./HostListings";
import HostSettings from "./HostSettings";

function MainDashboardHost(){
    const [activeComponent, setActiveComponent] = useState("Dashboard");
    const location = useLocation();

    useEffect(() => {
        if (location.pathname === "/hostdashboard/messages") {
            setActiveComponent("Messages");
        }
    }, [location.pathname]);

    function renderComponent(){
        switch (activeComponent){
            case "Dashboard":
                return <HostDashboard/>
            case "Calender":
                return <HostCalendar/>
            case "Reservations":
                return <HostReservations/>
            case "Messages":
                return <Messages dashboardType="host" /> 
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
        setActiveComponent(componentName);
    };

    return (
        <div className="main-dashboard-guest">
            <div className="main-dashboard-sidebar">
                <Pages onNavigate={handleNavigation} activeLabel={activeComponent} />
            </div>
            <div className="main-dashboard-content">
                {renderComponent()}
            </div>
        </div>
    );
}

export default MainDashboardHost