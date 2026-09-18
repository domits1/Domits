// reviewAPI.js

import { getAccessToken } from "../../../services/getAccessToken";

export const REVIEW_API_BASE =
  process.env.REACT_APP_REVIEW_API_BASE || "https://YOUR_REVIEW_API_URL/reviews";

const parseJsonResponse = async (response) => {
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
  const response = await fetch(REVIEW_API_BASE, {
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
  const response = await fetch(`${REVIEW_API_BASE}/${encodeURIComponent(reviewId)}`, {
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
  const response = await fetch(`${REVIEW_API_BASE}/${encodeURIComponent(reviewId)}`, {
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
  const requestUrl = new URL(REVIEW_API_BASE);
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
