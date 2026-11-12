import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { matchPath, Navigate, useLocation } from "react-router-dom";
import { useUser } from "../UserContext";
import { HOST_ROLES, ROLES } from "../roles";
import { hasReviewApprovalAccess } from "../../review/services/reviewAPI";

import { PROPERTY_REVIEW_LIST_PATH } from "../../hostdashboard/propertyreview/propertyReviewPaths";
import {
  CHANNEX_CERTIFICATION_ADMIN_ROUTE,
  CHANNEX_CERTIFICATION_LEGACY_ADMIN_ROUTE,
} from "../../hostdashboard/channexadmin/channexCertificationAccess";
import { REVIEW_APPROVAL_ADMIN_PATH } from "../../review/navigation/reviewApprovalRoute";

const ADMIN_PATHS = [
  REVIEW_APPROVAL_ADMIN_PATH,
  PROPERTY_REVIEW_LIST_PATH,
  `${PROPERTY_REVIEW_LIST_PATH}/:propertyId`,
  `/hostdashboard/${CHANNEX_CERTIFICATION_ADMIN_ROUTE}`,
  `/hostdashboard/${CHANNEX_CERTIFICATION_LEGACY_ADMIN_ROUTE}`,
];

const HostProtectedRoute = ({ children }) => {
  const { user, role, isPOM, isLoading } = useUser();
  const { pathname } = useLocation();
  const isAdminPath = ADMIN_PATHS.some((path) => matchPath(path, pathname));
  const isAdminRole = role === ROLES.ADMIN;
  const hasHostAccess = HOST_ROLES.includes(role) || isPOM;
  const needsApprovalCheck = !isLoading && Boolean(user) && !isAdminRole && !(isAdminPath && hasHostAccess);
  const [approvalAccess, setApprovalAccess] = useState(null);

  useEffect(() => {
    if (!needsApprovalCheck) return;

    let active = true;
    hasReviewApprovalAccess().then((allowed) => {
      if (active) setApprovalAccess({ user, allowed });
    });
    return () => {
      active = false;
    };
  }, [needsApprovalCheck, user]);

  if (isLoading || (needsApprovalCheck && approvalAccess?.user !== user)) {
    return <div>Loading...</div>;
  }

  const isAdmin = isAdminRole || (needsApprovalCheck && approvalAccess?.allowed);
  if (isAdmin && !isAdminPath) return <Navigate to={REVIEW_APPROVAL_ADMIN_PATH} replace />;
  if (hasHostAccess && needsApprovalCheck && approvalAccess?.allowed === null) {
    return <div role="alert">Could not verify dashboard access. Refresh the page to try again.</div>;
  }
  if (isAdmin || hasHostAccess) return children;

  return <Navigate to="/" replace />;
};

HostProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export default HostProtectedRoute;
