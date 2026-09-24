// reviewAPI.js

import { getAccessToken } from "../../../services/getAccessToken";

export const getReviewApiBase = () => {
  let reviewApiBase = String(process.env.REACT_APP_REVIEW_API_BASE || "").trim();

  while (reviewApiBase.endsWith("/")) {
    reviewApiBase = reviewApiBase.slice(0, -1);
  }

  return reviewApiBase;
};

// Review: Fails locally with a clear message when the ReviewSystem endpoint is not configured.
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
  // Review: Supports both JSON API payloads and empty Lambda responses.
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
  // Review: Submits one authenticated guest review to the collection endpoint.
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
  // Review: Requests only reviews written by the authenticated guest.
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
