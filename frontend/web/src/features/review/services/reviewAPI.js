import { getAccessToken } from "../../../services/getAccessToken";

export const API_REVIEW_BASE = "https://vk70rgm6z0.execute-api.eu-north-1.amazonaws.com/default/ReviewSystem";


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
  return fetch(`${API_REVIEW_BASE}?${new URLSearchParams(query)}`, {
    method, headers: { Authorization: getAccessToken() },
  });
};

export const createReview = async ({ reservationId, rating, publicReview, privateFeedback }) => {
  const response = await fetch(API_REVIEW_BASE, {
    method: "POST",
    headers: {
      Authorization: getAccessToken(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reservation_id: reservationId,
      overall_rating: Number(rating),
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
