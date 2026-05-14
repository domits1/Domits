import React from "react";
import ProtectedRoute from "../ProtectedRoute";
import { HOST_ROLES } from "../roles";

const HostProtectedRoute = ({ children }) => (
  <ProtectedRoute allowedRoles={HOST_ROLES}>{children}</ProtectedRoute>
);

export default HostProtectedRoute;
