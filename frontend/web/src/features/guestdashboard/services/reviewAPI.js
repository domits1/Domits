// Review: reviewAPI.js

import { getAccessToken } from "../../../services/getAccessToken";

export const getReviewApiBase = () =>
  "https://vk70rgm6z0.execute-api.eu-north-1.amazonaws.com/default/reviews";

const buildReviewUrl = (path = "") =>
  `${getReviewApiBase()}${path}`;

const buildReviewCollectionUrl = () =>
  new URL(getReviewApiBase());

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

// CREATE REVIEW
export async function createReview(payload) {
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

// GET REVIEW
export async function getReviewById(reviewId) {
  const response = await fetch(
    buildReviewUrl(`/${encodeURIComponent(reviewId)}`),
    {
      method: "GET",
      headers: {
        Authorization: await getAccessToken(),
      },
    }
  );

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(data?.message || "Could not load this review.");
  }

  return data?.review || data;
}

// UPDATE REVIEW
export async function updateReview(reviewId, payload) {
  const response = await fetch(
    buildReviewUrl(`/${encodeURIComponent(reviewId)}`),
    {
      method: "PATCH",
      headers: {
        Authorization: await getAccessToken(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(data?.message || "Could not update your review.");
  }

  return data;
}

// GUEST REVIEW HISTORY
export async function getGuestReviewHistory() {
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

// GET NOTIFICATION PREFERENCE
export async function getReviewNotificationPreference() {
  const response = await fetch(
    buildReviewUrl("/notification-preferences"),
    {
      method: "GET",
      headers: {
        Authorization: await getAccessToken(),
      },
    }
  );

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(
      data?.message || "Could not load review email settings."
    );
  }

  return data;
}

// UPDATE NOTIFICATION PREFERENCE
export async function setReviewNotificationPreference(emailEnabled) {
  const response = await fetch(
    buildReviewUrl("/notification-preferences"),
    {
      method: "PATCH",
      headers: {
        Authorization: await getAccessToken(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ emailEnabled }),
    }
  );

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(
      data?.message || "Could not update review email settings."
    );
  }

  return data;
}