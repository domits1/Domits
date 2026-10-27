
import { getIdToken } from "../../../services/getAccessToken";

export const API_REVIEW_BASE =
  "https://vk70rgm6z0.execute-api.eu-north-1.amazonaws.com/default";

export const saveHostResponse = async (reviewId, message) => {
  const response = await fetch(`${API_REVIEW_BASE}/reviews/${encodeURIComponent(reviewId)}/response/publish`, {
    method: "POST", headers: { Authorization: await getIdToken(), "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  const payload = await parseResponse(response);
  if (!response.ok) throw new Error(payload?.message || "Could not save your response. Please try again.");
  return payload.response;
};

export const getPropertyRatingTrends = async (query) => {
  const response = await requestReview("GET", { ...query, scope: "property-trends" });
  const payload = await parseResponse(response);
  if (!response.ok) throw new Error(payload?.message || "Could not load rating trends. Please try again.");
  return payload;
};

export const getPropertyReviewPerformance = async (query) => {
  const response = await requestReview("GET", { ...query, scope: "property-performance" });
  const payload = await parseResponse(response);
  if (!response.ok) throw new Error(payload?.message || "Could not load review performance. Please try again.");
  return payload;
};

export const getPublicReviews = async (propertyId, offset = 0, signal, filters = {}) => {
  const query = new URLSearchParams({ offset: String(offset) });
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== "" && value !== undefined) query.set(key, String(value));
  });
  const response = await fetch(
    `${API_REVIEW_BASE}/properties/${encodeURIComponent(propertyId)}/reviews?${query}`, { signal },
  );
  const payload = await parseResponse(response);
  if (!response.ok) throw new Error(payload?.message || "Could not load reviews. Please try again.");
  return payload;
};

const parseResponse = async (response) => {
  const text = await response.text().catch(() => "");
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

const readEditResponse = async (response) => {
  const payload = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      payload?.message ||
        "Could not access or update this review. Please try again."
    );
  }

  return payload;
};

const getReviewErrorMessage = (status, payload) => {
  if (status === 401)
    return "Please log in again before leaving a review.";

  if (status === 403)
    return "You can only review your own completed reservations.";

  if (status === 409)
    return "This reservation already has a review.";

  if (status === 400)
    return payload?.message || "Please check your review and try again.";

  return "Could not submit your review. Please try again.";
};

// Get an existing review
export const getEditableReview = async (reviewId) => {
  const token = await getIdToken();

  return readEditResponse(
    await fetch(
      `${API_REVIEW_BASE}/reviews/${encodeURIComponent(reviewId)}`,
      {
        method: "GET",
        headers: {
          Authorization: token,
        },
      }
    )
  );
};

// Update an existing review
export const updateReview = async ({
  reviewId,
  rating,
  publicReview,
  updatedAt,
}) => {
  const token = await getIdToken();

  return readEditResponse(
    await fetch(
      `${API_REVIEW_BASE}/reviews/${encodeURIComponent(reviewId)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          overall_rating: Number(rating),
          public_review: publicReview,
          updated_at: updatedAt,
        }),
      }
    )
  );
};

// Fetch written or received reviews
export const requestReview = async (method = "GET", query = {}) => {
  const token = await getIdToken();

  const { reviewId, ...parameters } = query;

  const path =
    reviewId === undefined
      ? "/reviews"
      : `/reviews/${encodeURIComponent(reviewId)}`;

  const search = new URLSearchParams(parameters).toString();

  const queryString = search ? "?" + search : "";
  return fetch(
    `${API_REVIEW_BASE}${path}${queryString}`,
    {
      method,
      headers: {
        Authorization: token,
      },
    }
  );
};

// Create a new review
export const createReview = async ({
  bookingId,
  rating,
  title,
  publicReview,
  privateFeedback,
  categoryRatings,
}) => {
  const token = await getIdToken();

  const response = await fetch(`${API_REVIEW_BASE}/reviews`, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      booking_id: bookingId,
      overall_rating: Number(rating),
      title,
      public_review: publicReview,
      private_feedback: privateFeedback,
      ...(categoryRatings ? { category_ratings: categoryRatings } : {}),
    }),
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    throw new Error(getReviewErrorMessage(response.status, payload));
  }

  return payload;
};

export async function reviewSchedule(propertyId, settings, signal) {
  const query = new URLSearchParams({ scope: "property-review-schedule", propertyId });
  const response = await fetch(`${API_REVIEW_BASE}/reviews?${query}`, {
    method: settings === undefined ? "GET" : "PATCH", signal,
    headers: { Authorization: await getIdToken(), "Content-Type": "application/json" },
    ...(settings === undefined ? {} : { body: JSON.stringify(settings) }),
  });
  const payload = await parseResponse(response);
  if (!response.ok) throw new Error(payload?.message || "Could not save review preferences.");
  return payload;
}

export const publishReview = async (reviewId) => {
  const response = await fetch(
    `${API_REVIEW_BASE}/reviews/${encodeURIComponent(reviewId)}/publish`,
    { method: "POST", headers: { Authorization: await getIdToken() } }
  );
  const payload = await parseResponse(response);
  if (!response.ok) throw new Error(payload?.message || "Could not publish your review. Please try again.");
  if (payload?.status !== "PUBLISHED" || payload?.publication_status !== "PUBLISHED") {
    throw new Error("Publication could not be confirmed. Please retry.");
  }
  return payload;
};
