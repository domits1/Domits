import React from "react";
import { Navigate } from "react-router-dom";
import { REMOTELOCK_UI_ENABLED } from "../constants/homeAutomationConstants";
import HomeAutomationView from "./HomeAutomationView";

// The route is always registered; with the page switched off it sends the host back to Settings. The flag
// is read when this renders, not when the module loads.
function HomeAutomationRoute() {
  return REMOTELOCK_UI_ENABLED ? <HomeAutomationView /> : <Navigate to="/hostdashboard/settings" replace />;
}

export default HomeAutomationRoute;
