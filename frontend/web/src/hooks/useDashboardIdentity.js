import { useEffect, useState } from "react";
import { Auth } from "aws-amplify";

import { getDashboardDisplayName } from "../utils/dashboardShared";

export default function useDashboardIdentity(fallbackName) {
  const [userId, setUserId] = useState(null);
  const [displayName, setDisplayName] = useState(fallbackName);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        const user = await Auth.currentAuthenticatedUser({ bypassCache: true });
        if (!isMounted) {
          return;
        }

        setUserId(user?.attributes?.sub || null);
        setDisplayName(getDashboardDisplayName(user, fallbackName));
        setLoading(false);
        setError(null);
      } catch {
        if (!isMounted) {
          return;
        }

        setUserId(null);
        setDisplayName(fallbackName);
        setLoading(false);
        setError("Unable to load your dashboard.");
      }
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [fallbackName]);

  return {
    userId,
    displayName,
    loading,
    error,
  };
}