import React from "react";
import PropTypes from "prop-types";
import { Navigate } from "react-router-dom";
import { useUser } from "../UserContext";
import { HOST_ROLES } from "../roles";

const HostProtectedRoute = ({ children }) => {
  const { role, isPOM, isLoading } = useUser();

  if (isLoading) return <div>Loading...</div>;

  if (!HOST_ROLES.includes(role) && !isPOM) return <Navigate to="/" replace />;

  return children;
};

HostProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export default HostProtectedRoute;
