import React from "react";
import { useLocation } from "react-router-dom";
import ProtectedRoute from "../ProtectedRoute";
import { GUEST_ROLES } from "../roles";

// Review: Sends signed-out review-link visitors through login without losing booking context.
const GuestProtectedRoute = ({ children }) => {
  const location = useLocation();

  return (
    <ProtectedRoute allowedRoles={GUEST_ROLES} loginRedirect={location.pathname === "/guestdashboard/reviews/new"}>
      {children}
    </ProtectedRoute>
  );
};

export default GuestProtectedRoute;
