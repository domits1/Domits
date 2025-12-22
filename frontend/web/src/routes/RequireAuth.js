import React, { useEffect, useState } from "react";
import { Auth } from "aws-amplify";
import { Navigate, Outlet } from "react-router-dom";

const RequireAuth = ({ allowedGroups }) => {
  const [loading, setLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const check = async () => {
      try {
        const user = await Auth.currentAuthenticatedUser({ bypassCache: true });
        const attrs = user.attributes || {};
        const group = attrs["custom:group"];
        if (!allowedGroups || allowedGroups.length === 0) {
          if (isMounted) setIsAllowed(true);
        } else {
          if (isMounted) setIsAllowed(allowedGroups.includes(group));
        }
      } catch (err) {
        console.error("[RequireAuth] no authenticated user", err);
        if (isMounted) setIsAllowed(false);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    check();

    return () => {
      isMounted = false;
    };
  }, [allowedGroups]);

  if (loading) {
    return <div>Checking authentication…</div>;
  }

  if (!isAllowed) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default RequireAuth;

