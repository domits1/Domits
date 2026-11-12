import { useCallback, useEffect, useRef, useState } from "react";
import { approveReview, publishApprovedReview, getAdminReviews, getPendingApprovalReviews } from "../services/reviewAPI";

export const QUEUE_STATE = Object.freeze({
  LOADING: "loading",
  READY: "ready",
  DENIED: "denied",
  FAILED: "failed",
});

export default function useReviewApprovalQueue(scope) {
  const [result, setResult] = useState({ scope, reviews: [] });
  const pending = scope === "pending-approval";
  const reviews = result.scope === scope ? result.reviews : [];
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

    (pending ? getPendingApprovalReviews() : getAdminReviews(scope))
      .then((reviews) => {
        if (!mounted) return;
        setResult({ scope, reviews });
        setQueueState(QUEUE_STATE.READY);
      })
      .catch((error) => {
        if (!mounted) return;
        const denied = error?.status === 401 || error?.status === 403;
        setResult({ scope, reviews: [] });
        setLoadError(error?.message || "Could not load reviews.");
        setQueueState(denied ? QUEUE_STATE.DENIED : QUEUE_STATE.FAILED);
      });

    return () => {
      mounted = false;
    };
  }, [attempt, pending, scope]);

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
      const approved = await approveReview(review.id, review.updated_at);
      setResult((current) => ({
        ...current,
        reviews: current.scope === "pending-approval"
          ? current.reviews.filter((entry) => entry.id !== review.id)
          : current.reviews.map((entry) => entry.id === review.id ? { ...entry, ...approved } : entry),
      }));
      setNotice({ type: "success", message: `“${review.title}” is approved and awaiting publication.` });
    } catch (error) {
      setNotice({ type: "error", message: error?.message || "Could not approve this review. Please try again." });
    } finally {
      setApproving(review.id, false);
    }
  }, []);

  const publish = useCallback(async (review) => {
    if (inFlight.current.has(review.id)) return;
    setApproving(review.id, true);
    setNotice(null);
    try {
      const published = await publishApprovedReview(review.id);
      setResult((current) => ({
        ...current,
        reviews: current.scope === "approved"
          ? current.reviews.filter((entry) => entry.id !== review.id)
          : current.reviews.map((entry) => entry.id === review.id ? { ...entry, ...published } : entry),
      }));
      setNotice({ type: "success", message: `“${review.title}” is published.` });
    } catch (error) {
      setNotice({ type: "error", message: error?.message || "Could not publish this review. Please try again." });
    } finally {
      setApproving(review.id, false);
    }
  }, []);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  return {
    reviews, queueState: result.scope === scope ? queueState : QUEUE_STATE.LOADING,
    loadError, retry, approve, publish, approvingIds, notice,
  };
}
