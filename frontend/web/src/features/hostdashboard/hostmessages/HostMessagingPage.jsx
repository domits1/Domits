import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import Messages from "../../../components/messages/Messages";
import AutomationsPage from "./automations/AutomationsPage";
import "./automations/automations.scss";

const HostMessagingPage = () => (
  <div className="host-messaging-shell">
    <nav className="host-messaging-tabs" aria-label="Messaging views">
      <NavLink end to="/hostdashboard/messages">Inbox</NavLink>
      <NavLink to="/hostdashboard/messages/automations">Automations</NavLink>
    </nav>
    <Routes>
      <Route index element={<Messages dashboardType="host" />} />
      <Route path="automations" element={<AutomationsPage />} />
      <Route path="*" element={<Navigate to="/hostdashboard/messages" replace />} />
    </Routes>
  </div>
);

export default HostMessagingPage;
