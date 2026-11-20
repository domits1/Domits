import { useCallback, useEffect, useRef, useState } from "react";
import { createConnectSession } from "../services/hostDistributionApi";

export const CONNECT_STEP = {
  IDLE: "idle",
  CHECKLIST: "checklist",
  CONNECTING: "connecting",
  IFRAME: "iframe",
};

export const CONNECT_ERROR_MESSAGE = "We couldn't start the connection. Try again.";

const IDLE_FLOW = { step: CONNECT_STEP.IDLE, platform: null, propertyId: null, url: null };

// The connect flow for a listing whose distribution is already set up:
//
//   idle ──start──▶ checklist ──continue──▶ connecting ──session──▶ iframe ──close──▶ idle
//     ▲                │                         │                                     │
//     └────cancel──────┘                         └──session fails (error)──▶ idle      └▶ refresh(propertyId)
//
// The checklist comes first and nothing is requested before the host has confirmed it.
// `refresh` is useHostDistribution's, so closing the iframe reads the channels again once.
export function useConnectFlow({ refresh }) {
  const [flow, setFlow] = useState(IDLE_FLOW);
  const [errorMessage, setErrorMessage] = useState("");
  // The step as the latest event handler sees it. State alone lags a double click by one render,
  // and the checklist's Continue or the iframe's close must not run twice.
  const stepRef = useRef(CONNECT_STEP.IDLE);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const moveTo = useCallback((next) => {
    stepRef.current = next.step;
    setFlow(next);
  }, []);

  const start = useCallback(
    ({ platform, propertyId }) => {
      if (stepRef.current !== CONNECT_STEP.IDLE) return;
      setErrorMessage("");
      moveTo({ step: CONNECT_STEP.CHECKLIST, platform, propertyId, url: null });
    },
    [moveTo]
  );

  const cancel = useCallback(() => {
    if (stepRef.current !== CONNECT_STEP.CHECKLIST) return;
    moveTo(IDLE_FLOW);
  }, [moveTo]);

  const continueFromChecklist = useCallback(async () => {
    if (stepRef.current !== CONNECT_STEP.CHECKLIST) return;
    const { platform, propertyId } = flow;

    // PR B2 inserts the timezone choice and enableDistribution({ propertyId }) here, between the
    // confirmed checklist and the connect session. Until then only a listing whose distribution
    // is already READY can reach this point, so there is nothing to enable.

    moveTo({ step: CONNECT_STEP.CONNECTING, platform, propertyId, url: null });
    try {
      const { url } = await createConnectSession({ propertyId });
      if (!mountedRef.current) return;
      moveTo({ step: CONNECT_STEP.IFRAME, platform, propertyId, url });
    } catch (err) {
      console.error("Failed to create a Channex connect session:", err);
      if (!mountedRef.current) return;
      setErrorMessage(CONNECT_ERROR_MESSAGE);
      moveTo(IDLE_FLOW);
    }
  }, [flow, moveTo]);

  // Every way out of the iframe lands here, whether or not the host finished in Channex.
  const closeIframe = useCallback(() => {
    if (stepRef.current !== CONNECT_STEP.IFRAME) return;
    const { propertyId } = flow;
    moveTo(IDLE_FLOW);
    refresh(propertyId);
  }, [flow, moveTo, refresh]);

  return {
    step: flow.step,
    platform: flow.platform,
    url: flow.url,
    errorMessage,
    isActive: flow.step !== CONNECT_STEP.IDLE,
    start,
    cancel,
    continueFromChecklist,
    closeIframe,
  };
}
