// Review: reviewAPI.js

import { getAccessToken } from "../../../services/getAccessToken";

export const getReviewApiBase = () => {
  let reviewApiBase = String(process.env.REACT_APP_REVIEW_API_BASE || "").trim();
  while (reviewApiBase.endsWith("/")) {
    reviewApiBase = reviewApiBase.slice(0, -1);
  }
  return reviewApiBase;
};

// Review: Fails early when the frontend review API base URL is missing.
const requireReviewApiBase = () => {
  const reviewApiBase = getReviewApiBase();

  if (!reviewApiBase) {
    throw new Error("Review service is not configured.");
  }

  return reviewApiBase;
};

const buildReviewUrl = (path = "") => `${requireReviewApiBase()}${path}`;

const buildReviewCollectionUrl = () => new URL(requireReviewApiBase(), window.location.origin);

const parseJsonResponse = async (response) => {
  // Review: Allows review endpoints to return either JSON payloads or empty responses.
  const responseText = await response.text().catch(() => "");

  if (!responseText) {
    return null;
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return responseText;
  }
};

export async function createReview(payload) {
  // Review: Submits a new guest review to the ReviewSystem API.
  const response = await fetch(buildReviewUrl(), {
    method: "POST",
    headers: {
      Authorization: getAccessToken(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(data?.message || "Could not submit your review.");
  }

  return data;
}

export async function getReviewById(reviewId) {
  // Review: Loads one review so an author can edit or inspect it.
  const response = await fetch(buildReviewUrl(`/${encodeURIComponent(reviewId)}`), {
    method: "GET",
    headers: {
      Authorization: getAccessToken(),
    },
  });

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(data?.message || "Could not load this review.");
  }

  return data?.review || data;
}

export async function updateReview(reviewId, payload) {
  // Review: Saves edits or status changes for an existing guest review.
  const response = await fetch(buildReviewUrl(`/${encodeURIComponent(reviewId)}`), {
    method: "PATCH",
    headers: {
      Authorization: getAccessToken(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(data?.message || "Could not update your review.");
  }

  return data;
}

export async function getGuestReviewHistory() {
  // Review: Requests the authenticated guest's own review history.
  const requestUrl = buildReviewCollectionUrl();
  requestUrl.searchParams.set("mine", "true");

  const response = await fetch(requestUrl.toString(), {
    method: "GET",
    headers: {
      Authorization: getAccessToken(),
    },
  });

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(data?.message || "Could not load your reviews.");
  }

  return Array.isArray(data) ? data : data?.reviews || [];
}

export async function getReviewNotificationPreference() {
  // Review: Reads whether review request emails are enabled for the guest.
  const response = await fetch(buildReviewUrl("/notification-preferences"), {
    headers: { Authorization: getAccessToken() },
  });
  const data = await parseJsonResponse(response);
  if (!response.ok) throw new Error(data?.message || "Could not load review email settings.");
  return data;
}

export async function setReviewNotificationPreference(emailEnabled) {
  // Review: Updates review request email preferences for the guest.
  const response = await fetch(buildReviewUrl("/notification-preferences"), {
    method: "PATCH",
    headers: { Authorization: getAccessToken(), "Content-Type": "application/json" },
    body: JSON.stringify({ emailEnabled }),
  });
  const data = await parseJsonResponse(response);
  if (!response.ok) throw new Error(data?.message || "Could not update review email settings.");
  return data;
}
