import { useCallback, useEffect, useRef, useState } from "react";
import { disconnectChannel } from "../services/hostDistributionApi";
import { classifyDisconnectError } from "../utils/disconnectErrors";

export const DISCONNECT_STEP = {
  IDLE: "idle",
  CONFIRM: "confirm",
  DISCONNECTING: "disconnecting",
};

const IDLE_FLOW = { step: DISCONNECT_STEP.IDLE, platform: null, channel: null, propertyId: null };

// Turning one OTA off from its switch (design note #3954, D5):
//
//   idle ──start──▶ confirm ──Turn off──▶ disconnecting ──ok──▶ idle, the answer is applied
//     ▲                │                        │
//     └──── Cancel ────┘                        └─ error ─▶ idle, with the message; a 404, 409 or 5xx
//                                                           also reads the listing again
//                                                           (see utils/disconnectErrors.js)
//
// Nothing is requested before the host confirms. The backend answers at once with the channel
// DISCONNECTING and finishes about a minute later, so a successful answer is applied as it is and
// the card says Disconnecting… until the host clicks Refresh. `refresh` and `applyListing` are
// useHostDistribution's. The step ref and the mounted ref work as in useConnectFlow: state lags a
// double click by one render, and an answer after unmount must change nothing.
export function useDisconnectFlow({ refresh, applyListing }) {
  const [flow, setFlow] = useState(IDLE_FLOW);
  const [errorMessage, setErrorMessage] = useState("");
  const stepRef = useRef(DISCONNECT_STEP.IDLE);
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
    ({ platform, propertyId, channel }) => {
      if (stepRef.current !== DISCONNECT_STEP.IDLE) return;
      // The contract sends no channel id yet, and a request without one would go to /host/channels/undefined.
      if (!channel?.channelId) return;
      setErrorMessage("");
      moveTo({ step: DISCONNECT_STEP.CONFIRM, platform, channel, propertyId });
    },
    [moveTo]
  );

  const cancel = useCallback(() => {
    if (stepRef.current !== DISCONNECT_STEP.CONFIRM) return;
    moveTo(IDLE_FLOW);
  }, [moveTo]);

  const confirm = useCallback(async () => {
    if (stepRef.current !== DISCONNECT_STEP.CONFIRM) return;
    const { platform, channel, propertyId } = flow;
    moveTo({ step: DISCONNECT_STEP.DISCONNECTING, platform, channel, propertyId });

    // A reset (or an unmount) while the request runs ended this attempt: its answer must change nothing.
    const isCurrent = () => mountedRef.current && stepRef.current === DISCONNECT_STEP.DISCONNECTING;
    let answer;
    try {
      answer = await disconnectChannel({ channelId: channel.channelId });
    } catch (err) {
      console.error("Failed to turn off a channel:", err);
      if (!isCurrent()) return;
      const { refresh: shouldRefresh, message } = classifyDisconnectError(err);
      setErrorMessage(message);
      moveTo(IDLE_FLOW);
      if (shouldRefresh) refresh(propertyId);
      return;
    }
    if (!isCurrent()) return;

    moveTo(IDLE_FLOW);
    // The answer replaces the listing, but only if it is this listing: an answer without one, or for
    // another, must not put a wrong object in the list, so the host's listing is read again instead.
    if (answer?.listing?.propertyId === propertyId) {
      applyListing(propertyId, answer.listing);
    } else {
      refresh(propertyId);
    }
  }, [applyListing, flow, moveTo, refresh]);

  // For a section that reloaded or lost the flow's listing: its modal is gone, so the step goes with it.
  // Otherwise the step would stay, and keep every switch locked with nothing on screen.
  const reset = useCallback(() => {
    if (stepRef.current === DISCONNECT_STEP.IDLE) return;
    moveTo(IDLE_FLOW);
  }, [moveTo]);

  const clearError = useCallback(() => setErrorMessage(""), []);

  return {
    step: flow.step,
    platform: flow.platform,
    channel: flow.channel,
    propertyId: flow.propertyId,
    errorMessage,
    isActive: flow.step !== DISCONNECT_STEP.IDLE,
    start,
    cancel,
    reset,
    confirm,
    clearError,
  };
}
