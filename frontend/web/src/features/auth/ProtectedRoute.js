import React from "react";
import PropTypes from "prop-types";
import { Navigate } from "react-router-dom";
import { useUser } from "./UserContext";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { role, isLoading } = useUser();

  if (isLoading) return <div>Loading...</div>;

  if (!allowedRoles.includes(role)) return <Navigate to="/" replace />;

  return children;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default ProtectedRoute;
