import { useCallback, useEffect, useRef, useState } from "react";
import { createConnectSession, enableDistribution } from "../services/hostDistributionApi";
import { classifyConnectSessionError } from "../utils/connectErrors";
import { DISTRIBUTION_STATUS } from "../utils/distributionStates";
import { classifyEnableError } from "../utils/enableErrors";

export const CONNECT_STEP = {
  IDLE: "idle",
  CHECKLIST: "checklist",
  TIMEZONE: "timezone",
  ENABLING: "enabling",
  CONNECTING: "connecting",
  IFRAME: "iframe",
};

const IDLE_FLOW = { step: CONNECT_STEP.IDLE, platform: null, listing: null, url: null };

// The connect flow behind a platform switch (design note #3954, D2, D4):
//
//   idle ──start──▶ checklist ──Continue──▶ ┬─ listing READY ───────────────────────────────────┐
//     ▲                │                    └─ not turned on ─▶ timezone required?              │
//     │              Cancel                                      yes ▶ timezone ─Continue(zone)─┐│
//     │                                                          no ───────────────────────────┤│
//     │                                                                                        ▼│
//     │      enabling: enableDistribution ─ok──▶ rereadListings ─ READY ──────────────────────┤│
//     │            │                                          └─ not READY ▶ idle ("Setting up…")││
//     │            └─ error ─▶ idle, with the message; some codes also read the listings again   ││
//     │                         (see utils/enableErrors.js)                                      ││
//     │                                                                                        ▼▼
//     └──close, refresh(propertyId) once ── iframe ◀──session ok── connecting ◀────────────────┘
//                                                       session fails: message, idle (404 or 409
//                                                       also rereadListings)
//
// retry({ listing }) is the same machine without the checklist and the session: idle ──▶ [timezone] ──▶
// enabling ──▶ idle, for the Retry of a setup that did not finish.
//
// The checklist comes first and nothing is requested before the host has confirmed it. `refresh` and
// `rereadListings` are useHostDistribution's: the listing the host sees follows every answer.
export function useConnectFlow({ refresh, rereadListings }) {
  const [flow, setFlow] = useState(IDLE_FLOW);
  const [errorMessage, setErrorMessage] = useState("");
  // The step as the latest event handler sees it. State alone lags a double click by one render,
  // and a Continue or a close must not run twice.
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
    ({ platform, listing }) => {
      if (stepRef.current !== CONNECT_STEP.IDLE) return;
      setErrorMessage("");
      moveTo({ step: CONNECT_STEP.CHECKLIST, platform, listing, url: null });
    },
    [moveTo]
  );

  const cancel = useCallback(() => {
    if (stepRef.current !== CONNECT_STEP.CHECKLIST && stepRef.current !== CONNECT_STEP.TIMEZONE) return;
    moveTo(IDLE_FLOW);
  }, [moveTo]);

  const openSession = useCallback(
    async ({ platform, propertyId }) => {
      moveTo({ step: CONNECT_STEP.CONNECTING, platform, listing: null, url: null, propertyId });
      try {
        const { iframeUrl } = await createConnectSession({ propertyId });
        if (!mountedRef.current) return;
        moveTo({ step: CONNECT_STEP.IFRAME, platform, listing: null, url: iframeUrl, propertyId });
      } catch (err) {
        console.error("Failed to create a Channex connect session:", err);
        if (!mountedRef.current) return;
        const { reread, message } = classifyConnectSessionError(err);
        setErrorMessage(message);
        moveTo(IDLE_FLOW);
        if (reread) rereadListings();
      }
    },
    [moveTo, rereadListings]
  );

  const failEnable = useCallback(
    (err) => {
      console.error("Failed to turn on distribution for a listing:", err);
      if (!mountedRef.current) return;
      const { reread, message } = classifyEnableError(err);
      setErrorMessage(message);
      moveTo(IDLE_FLOW);
      if (reread) rereadListings();
    },
    [moveTo, rereadListings]
  );

  // Turns distribution on, reads the listings again, and goes on to the connect session once the
  // listing is READY.
  const enableThenConnect = useCallback(
    async ({ platform, propertyId, timezone }) => {
      moveTo({ step: CONNECT_STEP.ENABLING, platform, listing: null, url: null, propertyId });
      let enabled;
      try {
        // The timezone is sent only where the listing asked for one (D4).
        await enableDistribution({ propertyId, ...(timezone ? { chosenTimezone: timezone } : {}) });
        if (!mountedRef.current) return;
        // The answer says nothing about the listing, so the listings are read again to see its state.
        const fresh = await rereadListings();
        enabled = fresh?.find((candidate) => candidate.propertyId === propertyId);
        if (!enabled) throw new Error("The listings read after turning on did not contain the listing.");
      } catch (err) {
        failEnable(err);
        return;
      }
      if (!mountedRef.current) return;

      if (enabled.distribution?.status !== DISTRIBUTION_STATUS.READY) {
        // Still setting up: the listing says so and Retry turns it on again. No iframe yet.
        moveTo(IDLE_FLOW);
        return;
      }
      // A retry has no platform: the host only wanted the listing set up, and the cards show next.
      if (!platform) {
        moveTo(IDLE_FLOW);
        return;
      }
      await openSession({ platform, propertyId });
    },
    [failEnable, moveTo, openSession, rereadListings]
  );

  // Turns a listing on: asks for the timezone first where the listing requires one (D4), and
  // otherwise enables straight away.
  const enableOrAskTimezone = useCallback(
    async ({ platform, listing }) => {
      const { propertyId } = listing;
      if (listing.distribution?.timezone?.required) {
        // A required choice with no options would be a dead modal, so it is an error instead.
        if (!listing.distribution.timezone.options?.length) {
          failEnable(new Error("The listing requires a timezone but offered no options."));
          return;
        }
        moveTo({ step: CONNECT_STEP.TIMEZONE, platform, listing, url: null });
        return;
      }
      await enableThenConnect({ platform, propertyId });
    },
    [enableThenConnect, failEnable, moveTo]
  );

  const continueFromChecklist = useCallback(async () => {
    if (stepRef.current !== CONNECT_STEP.CHECKLIST) return;
    const { platform, listing } = flow;
    const { propertyId } = listing;

    // A listing that is already READY has nothing to turn on: straight to the session.
    if (listing.distribution?.status === DISTRIBUTION_STATUS.READY) {
      await openSession({ platform, propertyId });
      return;
    }

    await enableOrAskTimezone({ platform, listing });
  }, [enableOrAskTimezone, flow, openSession]);

  // The Retry of a setup that did not finish (D2: the next attempt resumes). No checklist and no
  // platform: the listing is only set up, and the host sees the cards when it is READY.
  const retry = useCallback(
    async ({ listing }) => {
      if (stepRef.current !== CONNECT_STEP.IDLE) return;
      setErrorMessage("");
      await enableOrAskTimezone({ platform: null, listing });
    },
    [enableOrAskTimezone]
  );

  const continueFromTimezone = useCallback(
    async (timezone) => {
      if (stepRef.current !== CONNECT_STEP.TIMEZONE) return;
      const { platform, listing } = flow;
      await enableThenConnect({ platform, propertyId: listing.propertyId, timezone });
    },
    [enableThenConnect, flow]
  );

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
    listing: flow.listing,
    url: flow.url,
    errorMessage,
    isActive: flow.step !== CONNECT_STEP.IDLE,
    start,
    cancel,
    continueFromChecklist,
    continueFromTimezone,
    retry,
    closeIframe,
  };
}
