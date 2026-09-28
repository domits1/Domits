// reviewAPI.js

import { getAccessToken } from "../../../services/getAccessToken";

const REVIEW_API_BASE = "https://vk70rgm6z0.execute-api.eu-north-1.amazonaws.com/default/reviews";

export const getReviewApiBase = () => REVIEW_API_BASE;

const buildReviewUrl = (path = "") => `${REVIEW_API_BASE}${path}`;

const buildReviewCollectionUrl = () => new URL(REVIEW_API_BASE);

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
      Authorization: await getAccessToken(),
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
      Authorization: await getAccessToken(),
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
      Authorization: await getAccessToken(),
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
      Authorization: await getAccessToken(),
    },
  });

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(data?.message || "Could not load your reviews.");
  }

  return Array.isArray(data) ? data : data?.reviews || [];
}
