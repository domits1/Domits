import React from "react";
import ProtectedRoute from "../ProtectedRoute";
import { GUEST_ROLES } from "../roles";

const GuestProtectedRoute = ({ children }) => (
  <ProtectedRoute allowedRoles={GUEST_ROLES}>{children}</ProtectedRoute>
);

export default GuestProtectedRoute;
