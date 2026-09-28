// Review: reviewAPI.js

import { getAccessToken } from "../../../services/getAccessToken";

// Returns the configured review API endpoint.
// Keeps requests in this module pointed at the same service.
export const getReviewApiBase = () =>
  "https://vk70rgm6z0.execute-api.eu-north-1.amazonaws.com/default/reviews";

// Appends a resource path to the review API endpoint.
// Used for requests targeting a specific review or subresource.
const buildReviewUrl = (path = "") =>
  `${getReviewApiBase()}${path}`;

// Creates a URL for collection requests with query parameters.
// The returned URL can be safely updated through searchParams.
const buildReviewCollectionUrl = () =>
  new URL(getReviewApiBase());

// Parses JSON response bodies while preserving plain-text error responses.
// Returns null for an empty body so callers can handle no-content responses.
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

// Submits a review payload to the API.
// Returns the parsed result or throws the server's error message.
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

// Loads a review by its identifier.
// Unwraps the API's review field when the response includes it.
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

// Applies partial changes to an existing review.
// Returns the parsed update result or throws the server's error message.
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

// Loads the authenticated guest's review history.
// Normalizes either supported API response shape to an array.
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

// Loads the authenticated user's review email preference.
// Returns the parsed preference response from the API.
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

// Updates whether the authenticated user receives review emails.
// Sends the preference as a boolean and returns the API response.
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