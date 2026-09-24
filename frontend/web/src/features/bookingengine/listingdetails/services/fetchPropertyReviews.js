// Review: Public property review API helpers for the listing details page.
import { getMockPropertyReviewsByPropertyId } from "./mockPropertyReviews";

const getPublicReviewApiBase = () => process.env.REACT_APP_REVIEW_API_BASE || "";
const shouldUseMockReviews = () => process.env.REACT_APP_USE_MOCK_REVIEWS === "true";

// Review: Supported sort values are shared by mock and API requests.
const REVIEW_SORTS = new Set(["recent", "highest", "lowest"]);

// Review: Checks every supported verified-review flag used by public payloads.
const isVerifiedReview = (review) =>
  review?.verified === true ||
  review?.verifiedStay === true ||
  review?.isVerified === true ||
  String(review?.verificationStatus || "").toUpperCase() === "VERIFIED_STAY";

// Review: Reads ratings as numbers so mock sorting stays stable.
const getReviewRatingValue = (review) =>
  Number(review?.overallRating ?? review?.rating ?? review?.score ?? 0) || 0;

// Review: Reads dates as timestamps so recent sorting works for mock data.
const getReviewDateValue = (review) => {
  const dateValue = review?.publishedAt || review?.reviewDate || review?.createdAt || review?.date || 0;
  const timestamp = Number(dateValue);

  if (Number.isFinite(timestamp) && timestamp > 0) {
    return timestamp;
  }

  const parsedDate = new Date(dateValue).getTime();
  return Number.isFinite(parsedDate) ? parsedDate : 0;
};

// Review: Checks category score shapes returned by mock and backend reviews.
const reviewHasCategory = (review, category) =>
  review?.categoryRatings?.[category] != null || review?.categoryScores?.[category] != null;

// Review: Calculates a one-decimal average for filtered mock summaries.
const calculateAverage = (values) => {
  const numericValues = values.map(Number).filter(Number.isFinite);

  if (numericValues.length === 0) {
    return null;
  }

  const total = numericValues.reduce((sum, value) => sum + value, 0);
  return Number((total / numericValues.length).toFixed(1));
};

// Review: Rebuilds category averages for mock reviews after filters are applied.
const calculateCategoryScores = (reviews) =>
  reviews.reduce((categoryScores, review) => {
    const reviewCategoryScores = review?.categoryRatings || review?.categoryScores || {};

    Object.entries(reviewCategoryScores).forEach(([category, value]) => {
      const numericValue = Number(value);

      if (!Number.isFinite(numericValue)) {
        return;
      }

      if (!categoryScores[category]) {
        categoryScores[category] = [];
      }

      categoryScores[category].push(numericValue);
    });

    return categoryScores;
  }, {});

// Review: Builds a consistent summary object for filtered mock data.
const buildMockSummary = (reviews) => {
  const categoryValues = calculateCategoryScores(reviews);
  const categoryScores = Object.entries(categoryValues).reduce((summary, [category, values]) => {
    summary[category] = calculateAverage(values);
    return summary;
  }, {});

  return {
    averageRating: calculateAverage(reviews.map(getReviewRatingValue)),
    totalReviews: reviews.length,
    verifiedReviewCount: reviews.filter(isVerifiedReview).length,
    categoryScores,
  };
};

const normalizeReviewResponse = (data) => {
  const reviews = Array.isArray(data) ? data : data?.reviews || [];

  return {
    summary: {
      averageRating: data?.overallRating ?? data?.averageRating ?? null,
      totalReviews: data?.totalReviews ?? reviews.length,
      verifiedReviewCount: data?.verifiedReviewCount ?? reviews.filter(isVerifiedReview).length,
      categoryScores: data?.categoryScores || data?.categoryRatings || {},
    },
    reviews,
  };
};

// Review: Applies the same sort and filter behavior when mock data is used.
const filterMockReviewResponse = (data, filters = {}) => {
  const normalizedResponse = normalizeReviewResponse(data);
  let filteredReviews = [...normalizedResponse.reviews];

  if (filters.verifiedOnly) {
    filteredReviews = filteredReviews.filter(isVerifiedReview);
  }

  if (filters.category) {
    filteredReviews = filteredReviews.filter((review) => reviewHasCategory(review, filters.category));
  }

  if (filters.sort === "highest") {
    filteredReviews.sort((firstReview, secondReview) => getReviewRatingValue(secondReview) - getReviewRatingValue(firstReview));
  } else if (filters.sort === "lowest") {
    filteredReviews.sort((firstReview, secondReview) => getReviewRatingValue(firstReview) - getReviewRatingValue(secondReview));
  } else {
    filteredReviews.sort((firstReview, secondReview) => getReviewDateValue(secondReview) - getReviewDateValue(firstReview));
  }

  return {
    ...normalizedResponse,
    summary: buildMockSummary(filteredReviews),
    reviews: filteredReviews,
  };
};

export const fetchPublicPropertyReviews = async (propertyId, filters = {}) => {
  // Review: Loads public listing reviews from mock data or the ReviewSystem API.
  const normalizedPropertyId = String(propertyId || "").trim();

  if (!normalizedPropertyId) {
    return { summary: null, reviews: [] };
  }

  const publicReviewApiBase = getPublicReviewApiBase();

  if (shouldUseMockReviews() || !publicReviewApiBase) {
    return filterMockReviewResponse(getMockPropertyReviewsByPropertyId(normalizedPropertyId), filters);
  }

  const requestUrl = new URL(publicReviewApiBase);
  requestUrl.searchParams.set("propertyId", normalizedPropertyId);

  // Review: Connects frontend controls to review API query parameters.
  if (REVIEW_SORTS.has(filters.sort)) {
    requestUrl.searchParams.set("sort", filters.sort);
  }

  if (filters.verifiedOnly) {
    requestUrl.searchParams.set("verified", "true");
  }

  if (filters.category) {
    requestUrl.searchParams.set("category", filters.category);
  }

  const response = await fetch(requestUrl.toString(), { method: "GET" });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "Could not load reviews.");
  }

  return normalizeReviewResponse(data);
};
