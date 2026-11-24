import { useCallback, useEffect, useRef, useState } from "react";
import { createConnectSession } from "../services/hostDistributionApi";
import { classifyConnectSessionError } from "../utils/connectErrors";

export const CONNECT_STEP = {
  IDLE: "idle",
  CHECKLIST: "checklist",
  CONNECTING: "connecting",
  IFRAME: "iframe",
};

const IDLE_FLOW = { step: CONNECT_STEP.IDLE, platform: null, propertyId: null, url: null };

// The connect flow for a listing whose distribution is already set up:
//
//   idle ──start──▶ checklist ──continue──▶ connecting ──session──▶ iframe ──close──▶ idle
//     ▲                │                         │                                     │
//     └────cancel──────┘                         └──session fails (error)──▶ idle      └▶ refresh(propertyId)
//                                                  (404 or 409 also rereadListings)
//
// The checklist comes first and nothing is requested before the host has confirmed it.
// `refresh` and `rereadListings` are useHostDistribution's: closing the iframe reads the channels again
// once, and an answer that says the listing changed reads the listings again.
export function useConnectFlow({ refresh, rereadListings }) {
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
      const { iframeUrl } = await createConnectSession({ propertyId });
      // A reset while the session was being created ended this attempt: its answer must not open a screen.
      if (!mountedRef.current || stepRef.current !== CONNECT_STEP.CONNECTING) return;
      moveTo({ step: CONNECT_STEP.IFRAME, platform, propertyId, url: iframeUrl });
    } catch (err) {
      console.error("Failed to create a Channex connect session:", err);
      if (!mountedRef.current || stepRef.current !== CONNECT_STEP.CONNECTING) return;
      const { reread, message } = classifyConnectSessionError(err);
      setErrorMessage(message);
      moveTo(IDLE_FLOW);
      if (reread) rereadListings();
    }
  }, [flow, moveTo, rereadListings]);

  // For a section that reloaded or lost the flow's listing: its modals are gone, so the step goes with
  // them. Otherwise the step would stay, and keep every switch locked with nothing on screen.
  const reset = useCallback(() => {
    if (stepRef.current === CONNECT_STEP.IDLE) return;
    moveTo(IDLE_FLOW);
  }, [moveTo]);

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
    propertyId: flow.propertyId,
    url: flow.url,
    errorMessage,
    isActive: flow.step !== CONNECT_STEP.IDLE,
    start,
    cancel,
    reset,
    continueFromChecklist,
    closeIframe,
  };
}
