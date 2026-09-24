import { getAccessToken } from "../../services/getAccessToken";
import { getReviewApiBase } from "../guestdashboard/services/reviewAPI";

// Review: Shared authorized request wrapper for internal moderation review endpoints.
const request = async (path, options = {}) => {
  const base = getReviewApiBase();
  if (!base) throw new Error("Review service is not configured.");
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { Authorization: getAccessToken(), ...(options.body ? { "Content-Type": "application/json" } : {}) },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || "Review moderation request failed.");
  return body;
};

export const getModerationQueue = () => request("/moderation");

// Review: Loads Domits-only private feedback for the selected review.
export const getDomitsPrivateFeedback = (reviewId) =>
  request(`/${encodeURIComponent(reviewId)}/domits-private-feedback`);

// Review: Loads the internal inbox of Domits private feedback across reviews.
export const getDomitsPrivateFeedbackInbox = () => request("/domits-private-feedback");

// Review: Sends an approve or reject decision with moderation reason and notes.
export const moderateReview = (reviewId, decision, reason, notes) =>
  request(`/${encodeURIComponent(reviewId)}/moderate`, {
    method: "POST",
    body: JSON.stringify({ decision, reason, notes }),
  });
