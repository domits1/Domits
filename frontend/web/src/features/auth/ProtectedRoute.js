import React from "react";
import { Navigate } from "react-router-dom";
import { useUser } from "./UserContext";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { role, isLoading } = useUser();

  if (isLoading) return <div>Loading...</div>;

  if (!allowedRoles.includes(role)) return <Navigate to="/" replace />;

  return children;
};

export default ProtectedRoute;
