import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Routes, Route, Navigate } from "react-router-dom";

import Pages from "./Pages2";
import { useNavigate } from "react-router-dom";
import HostDashboard from "./HostDashboard";
import HostCalendar from "./hostcalen/HostCalendar";
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
    const location = useLocation();

    useEffect(() => {
        if (location.pathname === "/hostdashboard/messages") {
            setActiveComponent("Messages");
        }
    }, [location.pathname]);
function MainDashboardHost() {
  return (
    <div className="main-dashboard-guest">
      <div className="main-dashboard-sidebar">
        <Pages />
      </div>

      <div className="main-dashboard-content">
        <Routes>
          <Route index element={<HostDashboard />} />

    const handleNavigation = (componentName) => {
        if (componentName === "Messages") {
            navigate('/host/messages');
            return;
        }
        setActiveComponent(componentName);
    };
          <Route path="calendar" element={<HostCalendar />} />
          <Route path="reservations" element={<HostReservations />} />
          <Route path="messages" element={<Messages dashboardType="host" />} />
          <Route path="revenues" element={<HostReports />} />
          <Route path="housekeeping" element={<HostPropertyCare />} />
          <Route path="finance" element={<HostFinanceTab />} />
          <Route path="pricing" element={<HostPricing />} />
          <Route path="listings" element={<HostListings />} />
          <Route path="settings" element={<HostSettings />} />

          <Route path="*" element={<Navigate to="." replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default MainDashboardHost;