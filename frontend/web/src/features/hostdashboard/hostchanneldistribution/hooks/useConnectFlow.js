import { useCallback, useEffect, useRef, useState } from "react";
import { createConnectSession, enableDistribution } from "../services/hostDistributionApi";
import { classifyConnectSessionError } from "../utils/connectErrors";
import { DISTRIBUTION_STATUS } from "../utils/distributionStates";
import { classifyEnableError } from "../utils/enableErrors";
import { TIMEOUT_MESSAGE, isTimeoutError, withTimeout } from "../utils/withTimeout";

export const CONNECT_STEP = {
  IDLE: "idle",
  CHECKLIST: "checklist",
  TIMEZONE: "timezone",
  ENABLING: "enabling",
  CONNECTING: "connecting",
  IFRAME: "iframe",
};

const SESSION_TIMEOUT_MS = 30000;
// Longer than the session: turning on provisions a listing at Channex.
const ENABLE_TIMEOUT_MS = 60000;

const NO_ERROR = { message: "", propertyId: null };

const IDLE_FLOW = { step: CONNECT_STEP.IDLE, platform: null, listing: null, url: null };

// The connect flow behind a platform switch (design note #3954, D2, D4). Its state diagram is in
// docs/internal/eng-reviews/2026-11-20-506-distribution-enable-flow.md.
export function useConnectFlow({ refresh, rereadListings }) {
  const [flow, setFlow] = useState(IDLE_FLOW);
  // The last failure and the listing it belongs to, so it does not follow the host to another one.
  const [error, setError] = useState(NO_ERROR);
  // Turned on, but its state could not be read afterwards: shown as setting up.
  const [unconfirmedSetupPropertyId, setUnconfirmedSetupPropertyId] = useState(null);
  // The step as handlers see it: state alone lags a double click by one render.
  const stepRef = useRef(CONNECT_STEP.IDLE);
  const mountedRef = useRef(true);
  // Numbers the requests, so a late answer of a reset attempt cannot act in a newer one.
  const attemptRef = useRef(0);

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

  // For the section: a message from this flow must not stay on screen next to another flow's.
  const clearError = useCallback(() => setError(NO_ERROR), []);

  const start = useCallback(
    ({ platform, listing }) => {
      if (stepRef.current !== CONNECT_STEP.IDLE) return;
      setError(NO_ERROR);
      setUnconfirmedSetupPropertyId(null);
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
      const attempt = ++attemptRef.current;
      const isCurrent = () =>
        mountedRef.current && attemptRef.current === attempt && stepRef.current === CONNECT_STEP.CONNECTING;
      moveTo({ step: CONNECT_STEP.CONNECTING, platform, listing: null, url: null, propertyId });
      try {
        const { iframeUrl } = await withTimeout(createConnectSession({ propertyId }), SESSION_TIMEOUT_MS);
        // A reset or a timeout ended this attempt.
        if (!isCurrent()) return;
        moveTo({ step: CONNECT_STEP.IFRAME, platform, listing: null, url: iframeUrl, propertyId });
      } catch (err) {
        console.error("Failed to create a Channex connect session:", err);
        if (!isCurrent()) return;
        const { reread, message } = isTimeoutError(err)
          ? { reread: false, message: TIMEOUT_MESSAGE }
          : classifyConnectSessionError(err);
        setError({ message, propertyId });
        moveTo(IDLE_FLOW);
        if (reread) rereadListings();
      }
    },
    [moveTo, rereadListings]
  );

  const failEnable = useCallback(
    (err, propertyId) => {
      console.error("Failed to turn on distribution for a listing:", err);
      if (!mountedRef.current) return;
      setUnconfirmedSetupPropertyId(null);
      const { reread, message } = isTimeoutError(err)
        ? { reread: true, message: TIMEOUT_MESSAGE }
        : classifyEnableError(err);
      setError({ message, propertyId });
      moveTo(IDLE_FLOW);
      if (reread) rereadListings();
    },
    [moveTo, rereadListings]
  );

  const enableThenConnect = useCallback(
    async ({ platform, propertyId, timezone }) => {
      const attempt = ++attemptRef.current;
      moveTo({ step: CONNECT_STEP.ENABLING, platform, listing: null, url: null, propertyId });
      // A reset, an unmount or a timeout ended this attempt.
      const isCurrent = () =>
        mountedRef.current && attemptRef.current === attempt && stepRef.current === CONNECT_STEP.ENABLING;
      let enabled;
      try {
        await withTimeout(
          enableDistribution({ propertyId, ...(timezone ? { chosenTimezone: timezone } : {}) }),
          ENABLE_TIMEOUT_MS
        );
        if (!isCurrent()) return;
        // The answer says nothing about the listing, so the listings are read again to see its state.
        const fresh = await rereadListings();
        // Turning on worked, only the read failed: that is not "we couldn't set up", so no error.
        if (fresh === null && isCurrent()) {
          setUnconfirmedSetupPropertyId(propertyId);
          moveTo(IDLE_FLOW);
          return;
        }
        if (fresh && isCurrent()) setUnconfirmedSetupPropertyId(null);
        enabled = fresh?.find((candidate) => candidate.propertyId === propertyId);
        if (!enabled) throw new Error("The listings read after turning on did not contain the listing.");
      } catch (err) {
        if (isCurrent()) failEnable(err, propertyId);
        return;
      }
      if (!isCurrent()) return;

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

  const enableOrAskTimezone = useCallback(
    async ({ platform, listing }) => {
      const { propertyId } = listing;
      if (listing.distribution?.timezone?.required) {
        // A required choice with no options would be a dead modal, so it is an error instead.
        if (!listing.distribution.timezone.options?.length) {
          failEnable(new Error("The listing requires a timezone but offered no options."), propertyId);
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

  // The Retry of a setup that did not finish (D2: the next attempt resumes): no checklist, no platform.
  const retry = useCallback(
    async ({ listing }) => {
      if (stepRef.current !== CONNECT_STEP.IDLE) return;
      setError(NO_ERROR);
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

  // A reloaded section or a lost listing has no modals left, so the step ends with them.
  const reset = useCallback(() => {
    setUnconfirmedSetupPropertyId(null);
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
    listing: flow.listing,
    propertyId: flow.propertyId ?? flow.listing?.propertyId ?? null,
    url: flow.url,
    errorMessage: error.message,
    errorPropertyId: error.propertyId,
    clearError,
    unconfirmedSetupPropertyId,
    isActive: flow.step !== CONNECT_STEP.IDLE,
    start,
    cancel,
    reset,
    continueFromChecklist,
    continueFromTimezone,
    retry,
    closeIframe,
  };
}
