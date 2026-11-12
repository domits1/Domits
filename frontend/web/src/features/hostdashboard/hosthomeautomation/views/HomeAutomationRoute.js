import React from "react";
import { Navigate } from "react-router-dom";
import { REMOTELOCK_UI_ENABLED } from "../constants/homeAutomationConstants";
import PropTypes from "prop-types";
import HomeAutomationView from "./HomeAutomationView";
import RemoteLockCallbackView from "./RemoteLockCallbackView";

// The route is always registered; with the page switched off it sends the host back to Settings. The flag
// is read when this renders, not when the module loads.
function HomeAutomationRoute({ callback = false }) {
  if (!REMOTELOCK_UI_ENABLED) return <Navigate to="/hostdashboard/settings" replace />;
  return callback ? <RemoteLockCallbackView /> : <HomeAutomationView />;
}

HomeAutomationRoute.propTypes = { callback: PropTypes.bool };

export default HomeAutomationRoute;
