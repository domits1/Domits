import React from "react";
import PropTypes from "prop-types";
import { Navigate, useLocation } from "react-router-dom";
import { useUser } from "./UserContext";

// Review: Optionally returns unauthenticated deep links to their original review page after login.
const ProtectedRoute = ({ children, allowedRoles, loginRedirect = false }) => {
  const { role, isLoading } = useUser();
  const location = useLocation();

  if (isLoading) return <div>Loading...</div>;

  if (!allowedRoles.includes(role)) {
    if (!role && loginRedirect) {
      // Review: Preserves path, query, and hash values from review invitation links.
      const returnPath = `${location.pathname}${location.search}${location.hash}`;
      return <Navigate to={`/login?redirect=${encodeURIComponent(returnPath)}`} replace />;
    }

    return <Navigate to="/" replace />;
  }

  return children;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.string).isRequired,
  loginRedirect: PropTypes.bool,
};

export default ProtectedRoute;
