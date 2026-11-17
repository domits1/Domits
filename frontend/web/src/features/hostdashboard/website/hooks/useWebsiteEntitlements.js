import { useCallback, useEffect, useState } from "react";
import { getWebsiteEntitlements } from "../services/websitePlanService";

export const WEBSITE_ENTITLEMENTS_STATUS = Object.freeze({
  LOADING: "loading",
  READY: "ready",
  UNAVAILABLE: "unavailable",
});

const NO_ENTITLEMENTS = new Set();

export const useWebsiteEntitlements = () => {
  const [state, setState] = useState({
    status: WEBSITE_ENTITLEMENTS_STATUS.LOADING,
    entitlements: NO_ENTITLEMENTS,
  });

  useEffect(() => {
    let cancelled = false;

    getWebsiteEntitlements().then(
      (entitlements) => {
        if (!cancelled) {
          setState({ status: WEBSITE_ENTITLEMENTS_STATUS.READY, entitlements: new Set(entitlements) });
        }
      },
      () => {
        if (!cancelled) {
          setState({ status: WEBSITE_ENTITLEMENTS_STATUS.UNAVAILABLE, entitlements: NO_ENTITLEMENTS });
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  const { status, entitlements } = state;
  const has = useCallback((entitlement) => entitlements.has(entitlement), [entitlements]);

  return { status, has };
};
