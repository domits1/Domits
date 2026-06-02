import { useState, useEffect } from "react";
import { Auth } from "aws-amplify";

import { getDashboardDisplayName } from "../utils/dashboardShared";
import useEffectiveHostId from "./useEffectiveHostId";

export default function useDashboardIdentity(fallbackName) {
  const { effectiveHostId, loading: hostIdLoading } = useEffectiveHostId();
  const [displayName, setDisplayName] = useState(fallbackName);
  const [nameLoading, setNameLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    Auth.currentAuthenticatedUser({ bypassCache: false })
      .then((user) => {
        if (!isMounted) return;
        setDisplayName(getDashboardDisplayName(user, fallbackName));
        setNameLoading(false);
        setError(null);
      })
      .catch(() => {
        if (!isMounted) return;
        setDisplayName(fallbackName);
        setNameLoading(false);
        setError("Unable to load your dashboard.");
      });

    return () => {
      isMounted = false;
    };
  }, [fallbackName]);

  return {
    userId: effectiveHostId,
    displayName,
    loading: hostIdLoading || nameLoading,
    error,
  };
}
