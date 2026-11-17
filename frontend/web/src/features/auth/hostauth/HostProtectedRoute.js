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
  const needsApprovalCheck = !isLoading && Boolean(user) && !(isAdminPath && hasHostAccess);
  const [approvalAccess, setApprovalAccess] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!needsApprovalCheck) return;

    let active = true;
    hasReviewApprovalAccess().then((allowed) => {
      if (active) setApprovalAccess({ user, allowed });
    });
    return () => {
      active = false;
    };
  }, [needsApprovalCheck, user, retryCount]);

  if (isLoading || (needsApprovalCheck && approvalAccess?.user !== user)) {
    return <div>Loading...</div>;
  }

  const isReviewApprover = needsApprovalCheck && approvalAccess?.allowed === true;
  if (isReviewApprover && !isAdminPath) return <Navigate to={REVIEW_APPROVAL_ADMIN_PATH} replace />;
  if (isAdminRole && !isAdminPath) {
    if (approvalAccess?.allowed === null) {
      return <div role="alert">
        Could not verify review administration access.
        <button type="button" onClick={() => {
          setApprovalAccess(null);
          setRetryCount((count) => count + 1);
        }}>Try again</button>
      </div>;
    }
    return <div role="alert">Your account does not have review approval access.</div>;
  }
  // A review-service outage must not revoke an existing host entitlement.
  // Confirmed approvers still redirect above; backend routes enforce permissions.
  if (isReviewApprover || hasHostAccess) return children;

  return <Navigate to="/" replace />;
};

HostProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export default HostProtectedRoute;
