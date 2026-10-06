import { getAccessToken } from "../../../services/getAccessToken";

export const API_REVIEW_BASE = "https://vk70rgm6z0.execute-api.eu-north-1.amazonaws.com/default";

const readEditResponse = async (response) => {
  const payload = await parseResponse(response);
  if (!response.ok) throw new Error(payload?.message || "Could not access or update this review. Please try again.");
  return payload;
};

export const getEditableReview = async (reviewId) =>
  readEditResponse(await requestReview("GET", { reviewId }));

export const updateReview = async ({ reviewId, rating, publicReview, updatedAt }) =>
  readEditResponse(await fetch(`${API_REVIEW_BASE}/reviews?${new URLSearchParams({ reviewId })}`, {
    method: "PATCH",
    headers: { Authorization: getAccessToken(), "Content-Type": "application/json" },
    body: JSON.stringify({ overall_rating: Number(rating), public_review: publicReview, updated_at: updatedAt }),
  }));


const parseResponse = async (response) => {
  const text = await response.text().catch(() => "");
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

const getReviewErrorMessage = (status, payload) => {
  if (status === 401) return "Please log in again before leaving a review.";
  if (status === 403) return "You can only review your own completed reservations.";
  if (status === 409) return "This reservation already has a review.";
  if (status === 400) return payload?.message || "Please check your review and try again.";
  return "Could not submit your review. Please try again.";
};

export const requestReview = async (method = "GET", query = {}) => {
  const { reviewId, ...parameters } = query;
  const path = reviewId === undefined ? "/reviews" : `/reviews/${encodeURIComponent(reviewId)}`;
  const search = new URLSearchParams(parameters).toString();
  return fetch(`${API_REVIEW_BASE}${path}${search ? `?${search}` : ""}`, {
    method, headers: { Authorization: getAccessToken() },
  });
};

export const createReview = async ({ bookingId, rating, title, publicReview, privateFeedback }) => {
  const response = await fetch(`${API_REVIEW_BASE}/reviews`, {
    method: "POST",
    headers: {
      Authorization: getAccessToken(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      booking_id: bookingId,
      overall_rating: Number(rating),
      title,
      public_review: publicReview,
      private_feedback: privateFeedback,
    }),
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    throw new Error(getReviewErrorMessage(response.status, payload));
  }

  return payload;
};
