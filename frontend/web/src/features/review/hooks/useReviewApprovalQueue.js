import { useCallback, useEffect, useRef, useState } from "react";
import { approveReview, getPendingApprovalReviews } from "../services/reviewAPI";

export const QUEUE_STATE = Object.freeze({
  LOADING: "loading",
  READY: "ready",
  DENIED: "denied",
  FAILED: "failed",
});

export default function useReviewApprovalQueue() {
  const [reviews, setReviews] = useState([]);
  const [queueState, setQueueState] = useState(QUEUE_STATE.LOADING);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [approvingIds, setApprovingIds] = useState(() => new Set());
  const [notice, setNotice] = useState(null);
  // State updates are async, so a second click before re-render would still see the old set.
  const inFlight = useRef(new Set());

  useEffect(() => {
    let mounted = true;
    setQueueState(QUEUE_STATE.LOADING);

    getPendingApprovalReviews()
      .then((pending) => {
        if (!mounted) return;
        setReviews(pending);
        setQueueState(QUEUE_STATE.READY);
      })
      .catch((error) => {
        if (!mounted) return;
        const denied = error?.status === 401 || error?.status === 403;
        setLoadError(error?.message || "Could not load reviews waiting for approval.");
        setQueueState(denied ? QUEUE_STATE.DENIED : QUEUE_STATE.FAILED);
      });

    return () => {
      mounted = false;
    };
  }, [attempt]);

  const setApproving = (reviewId, approving) => {
    if (approving) inFlight.current.add(reviewId);
    else inFlight.current.delete(reviewId);
    setApprovingIds(new Set(inFlight.current));
  };

  const approve = useCallback(async (review) => {
    if (inFlight.current.has(review.id)) return;
    setApproving(review.id, true);
    setNotice(null);
    try {
      await approveReview(review.id, review.updated_at);
      setReviews((current) => current.filter((entry) => entry.id !== review.id));
      setNotice({ type: "success", message: `“${review.title}” is approved and awaiting publication.` });
    } catch (error) {
      setNotice({ type: "error", message: error?.message || "Could not approve this review. Please try again." });
    } finally {
      setApproving(review.id, false);
    }
  }, []);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  return { reviews, queueState, loadError, retry, approve, approvingIds, notice };
}
