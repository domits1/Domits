import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { matchPath, Navigate, useLocation } from "react-router-dom";
import { useUser } from "../UserContext";
import { HOST_ROLES } from "../roles";
import { hasReviewApprovalAccess } from "../../review/services/reviewAPI";

import { REVIEW_APPROVAL_ADMIN_PATH } from "../../review/navigation/reviewApprovalRoute";

const HostProtectedRoute = ({ children }) => {
  const { user, role, isPOM, isLoading } = useUser();
  const userKey = user?.attributes?.sub || user?.username || user;
  const { pathname } = useLocation();
  const isReviewApprovalPath = Boolean(matchPath(REVIEW_APPROVAL_ADMIN_PATH, pathname));
  const hasHostAccess = HOST_ROLES.includes(role) || isPOM;
  const needsApprovalCheck = !isLoading && Boolean(user) && isReviewApprovalPath;
  const [approvalAccess, setApprovalAccess] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!needsApprovalCheck) return;

    let active = true;
    hasReviewApprovalAccess().then((allowed) => {
      if (active) setApprovalAccess({ userKey, allowed });
    });
    return () => {
      active = false;
    };
  }, [needsApprovalCheck, userKey, retryCount]);

  if (isLoading || (needsApprovalCheck && approvalAccess?.userKey !== userKey)) {
    return <div>Loading...</div>;
  }

  const isReviewApprover = needsApprovalCheck && approvalAccess?.allowed === true;
  if (isReviewApprovalPath && !isReviewApprover) {
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
  if (isReviewApprover || hasHostAccess) return children;

  return <Navigate to="/" replace />;
};

HostProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export default HostProtectedRoute;
