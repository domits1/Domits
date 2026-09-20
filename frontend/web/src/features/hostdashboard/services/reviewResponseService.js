import { getAccessToken } from "../../../services/getAccessToken";

export const getReviewApiBase = () => process.env.REACT_APP_REVIEW_API_BASE || "";

const shouldUseMockHostReviews = () =>
  process.env.REACT_APP_USE_MOCK_REVIEWS === "true" || !getReviewApiBase();

const mockReviewsByHostId = new Map();

const cloneResponse = (response) => (response ? { ...response } : null);

const cloneReview = (review) => ({
  ...review,
  response: cloneResponse(review.response),
});

const getMockHostReviews = (hostId) => {
  const normalizedHostId = String(hostId || "").trim();

  if (!mockReviewsByHostId.has(normalizedHostId)) {
    mockReviewsByHostId.set(normalizedHostId, [
      {
        id: `${normalizedHostId}-review-1`,
        status: "PUBLISHED",
        publicationStatus: "PUBLISHED",
        title: "Wonderful stay",
        publicReview: "Clean, calm, and close to everything we needed.",
        privateFeedback: "The check-in note could be a little clearer.",
        createdAt: Date.parse("2026-09-01T10:00:00.000Z"),
        publishedAt: Date.parse("2026-09-01T12:00:00.000Z"),
        response: {
          id: `${normalizedHostId}-response-1`,
          authorRole: "host",
          status: "draft",
          message: "Thank you for staying with us. We are glad you enjoyed the calm location.",
          createdAt: Date.parse("2026-09-02T10:00:00.000Z"),
          updatedAt: Date.parse("2026-09-02T10:00:00.000Z"),
          publishedAt: null,
        },
      },
      {
        id: `${normalizedHostId}-review-2`,
        status: "PUBLISHED",
        publicationStatus: "PUBLISHED",
        title: "Comfortable place",
        publicReview: "The host was responsive and the listing matched the photos.",
        createdAt: Date.parse("2026-08-21T10:00:00.000Z"),
        publishedAt: Date.parse("2026-08-21T13:00:00.000Z"),
        response: {
          id: `${normalizedHostId}-response-2`,
          authorRole: "property_manager",
          status: "published",
          message: "We appreciate your feedback and are glad the listing matched your expectations.",
          createdAt: Date.parse("2026-08-22T10:00:00.000Z"),
          updatedAt: Date.parse("2026-08-22T10:00:00.000Z"),
          publishedAt: Date.parse("2026-08-22T10:00:00.000Z"),
        },
      },
      {
        id: `${normalizedHostId}-review-3`,
        status: "PUBLISHED",
        publicationStatus: "PUBLISHED",
        title: "Helpful team",
        publicReview: "Questions were answered quickly and the apartment was ready on time.",
        createdAt: Date.parse("2026-08-12T10:00:00.000Z"),
        publishedAt: Date.parse("2026-08-12T12:00:00.000Z"),
        response: null,
      },
    ]);
  }

  return mockReviewsByHostId.get(normalizedHostId).map(cloneReview);
};

const findMockReview = (reviewId) => {
  const normalizedReviewId = String(reviewId || "").trim();

  for (const reviews of mockReviewsByHostId.values()) {
    const review = reviews.find((item) => item.id === normalizedReviewId);

    if (review) {
      return review;
    }
  }

  throw new Error("Could not find this review in the local demo data.");
};

const upsertMockResponse = (reviewId, message, status) => {
  const review = findMockReview(reviewId);
  const now = Date.now();
  const existingResponse = review.response || {};

  review.response = {
    id: existingResponse.id || `${review.id}-response`,
    authorRole: existingResponse.authorRole || "host",
    status,
    message,
    createdAt: existingResponse.createdAt || now,
    updatedAt: now,
    publishedAt: status === "published" ? existingResponse.publishedAt || now : existingResponse.publishedAt || null,
  };

  return { response: cloneResponse(review.response) };
};

const deleteMockResponse = (reviewId) => {
  const review = findMockReview(reviewId);
  review.response = null;

  return { message: "Review response deleted." };
};

const sendMockReviewResponseRequest = (reviewId, method, action, payload = null) => {
  const message = String(payload?.message || "").trim();

  if (method === "DELETE") {
    return deleteMockResponse(reviewId);
  }

  if (!message) {
    throw new Error("Response message is required.");
  }

  if (action === "response/publish") {
    return upsertMockResponse(reviewId, message, "published");
  }

  if (action === "response" && method === "PATCH") {
    const existingStatus = findMockReview(reviewId).response?.status || "draft";
    return upsertMockResponse(reviewId, message, existingStatus);
  }

  return upsertMockResponse(reviewId, message, "draft");
};

const parseJsonResponse = async (response) => {
  const text = await response.text().catch(() => "");

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const buildHeaders = () => ({
  Authorization: getAccessToken(),
  "Content-Type": "application/json",
});

export async function fetchHostReviews(hostId) {
  const normalizedHostId = String(hostId || "").trim();
  if (!normalizedHostId) return [];

  if (shouldUseMockHostReviews()) {
    return getMockHostReviews(normalizedHostId);
  }

  const requestUrl = new URL(getReviewApiBase());
  requestUrl.searchParams.set("hostId", normalizedHostId);

  const response = await fetch(requestUrl.toString(), {
    method: "GET",
    headers: buildHeaders(),
  });
  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(data?.message || "Could not load host reviews.");
  }

  return Array.isArray(data) ? data : data?.reviews || [];
}

export async function saveDraftReviewResponse(reviewId, message) {
  return sendReviewResponseRequest(reviewId, "POST", "response", { message });
}

export async function publishReviewResponse(reviewId, message) {
  return sendReviewResponseRequest(reviewId, "POST", "response/publish", { message });
}

export async function editReviewResponse(reviewId, message) {
  return sendReviewResponseRequest(reviewId, "PATCH", "response", { message });
}

export async function deleteReviewResponse(reviewId) {
  return sendReviewResponseRequest(reviewId, "DELETE", "response");
}

async function sendReviewResponseRequest(reviewId, method, action, payload = null) {
  if (shouldUseMockHostReviews()) {
    return sendMockReviewResponseRequest(reviewId, method, action, payload);
  }

  const response = await fetch(`${getReviewApiBase()}/${encodeURIComponent(reviewId)}/${action}`, {
    method,
    headers: buildHeaders(),
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(data?.message || "Could not update the review response.");
  }

  return data;
}
