
import { getIdToken } from "../../../services/getAccessToken";

export const API_REVIEW_BASE =
  "https://vk70rgm6z0.execute-api.eu-north-1.amazonaws.com/default";

export const saveHostResponse = async (reviewId, message, action = "publish") => {
  const suffix = action === "publish" ? "/publish" : "";
  const response = await fetch(`${API_REVIEW_BASE}/reviews/${encodeURIComponent(reviewId)}/response${suffix}`, {
    method: action === "edit" ? "PATCH" : "POST", headers: { Authorization: await getIdToken(), "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  const payload = await parseResponse(response);
  if (!response.ok) throw new Error(payload?.message || "Could not save your response. Please try again.");
  return payload.response;
};

export const deleteHostResponse = async (reviewId) => {
  const response = await fetch(`${API_REVIEW_BASE}/reviews/${encodeURIComponent(reviewId)}/response`, {
    method: "DELETE", headers: { Authorization: await getIdToken() },
  });
  if (!response.ok) {
    const payload = await parseResponse(response);
    throw new Error(payload?.message || "Could not delete your response. Please try again.");
  }
};

// The status lets the admin page tell "no approver role" apart from a failed request.
const reviewApprovalError = (response, payload, fallback) =>
  Object.assign(new Error(payload?.message || fallback), { status: response.status });

export const getAdminReviews = async (scope) => {
  const response = await requestReview("GET", { scope });
  const payload = await parseResponse(response);
  if (!response.ok) throw reviewApprovalError(response, payload, "Could not load reviews.");
  if (!Array.isArray(payload)) {
    throw reviewApprovalError(response, null, "Could not load reviews. The server returned an unexpected response. Please try again.");
  }
  return payload;
};

const requestModeration = async (method, fallback, query = {}, body) => {
  const response = await requestReview(method, { ...query, scope: "moderation" }, body);
  const payload = await parseResponse(response);
  if (!response.ok) throw reviewApprovalError(response, payload, fallback);
  return payload;
};

export const getReviewFlags = (query) =>
  requestModeration("GET", "Could not load the moderation queue.", query);

export const flagReview = (reviewId, reason, notes) =>
  requestModeration("POST", "Could not flag this review.", {}, { review_id: reviewId, reason, notes });

export const resolveReviewFlag = (flagId) =>
  requestModeration("PATCH", "Could not resolve this flag.", {}, { flag_id: flagId });

export const getPendingApprovalReviews = () => getAdminReviews("pending-approval");

export const publishApprovedReview = async (reviewId) => {
  const response = await fetch(`${API_REVIEW_BASE}/reviews/${encodeURIComponent(reviewId)}/publish`, {
    method: "POST",
    headers: { Authorization: await getIdToken() },
  });
  const payload = await parseResponse(response);
  if (!response.ok) throw reviewApprovalError(response, payload, "Could not publish this review. Please try again.");
  return payload;
};

export const hasReviewApprovalAccess = async () => {
  try {
    await getPendingApprovalReviews();
    return true;
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) return false;
    return null;
  }
};

// updatedAt is the version the admin saw; the backend refuses the approval if the review changed since.
export const approveReview = async (reviewId, updatedAt) => {
  const response = await fetch(`${API_REVIEW_BASE}/reviews/${encodeURIComponent(reviewId)}/approve`, {
    method: "POST",
    headers: { Authorization: await getIdToken(), "Content-Type": "application/json" },
    body: JSON.stringify({ updated_at: updatedAt }),
  });
  const payload = await parseResponse(response);
  if (!response.ok) throw reviewApprovalError(response, payload, "Could not approve this review. Please try again.");
  return payload;
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
export const requestReview = async (method = "GET", query = {}, body) => {
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
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }
  );
};

export const submitReviewForApproval = async (reviewId) => {
  const response = await fetch(`${API_REVIEW_BASE}/reviews/${encodeURIComponent(reviewId)}/publish`, {
    method: "POST",
    headers: { Authorization: await getIdToken() },
  });
  const payload = await parseResponse(response);
  if (!response.ok) throw new Error(getReviewErrorMessage(response.status, payload));
  return payload;
};

// Create a new review
export const createReview = async ({
  bookingId,
  rating,
  title,
  publicReview,
  privateFeedback,
  domitsPrivateFeedback,
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
      ...(domitsPrivateFeedback ? { domits_private_feedback: domitsPrivateFeedback } : {}),
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
  const published = payload?.status === "PUBLISHED" && payload?.publication_status === "PUBLISHED";
  const pending = payload?.status === "PENDING_APPROVAL" && payload?.publication_status === "UNPUBLISHED";
  if (!published && !pending) {
    throw new Error("Publication could not be confirmed. Please retry.");
  }
  return payload;
};
