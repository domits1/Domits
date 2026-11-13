import { randomInt } from "node:crypto";
import { In, IsNull } from "typeorm";
import Database from "database";
import { Review } from "database/models/Review";
import { Review_Rating } from "database/models/Review_Rating";
import { Review_Response } from "database/models/Review_Response";

const MAX_TRANSACTION_ATTEMPTS = 3;

export const REVIEW_FIELDS = [
  "id",
  "booking_id",
  "property_id",
  "host_id",
  "reviewer_user_id",
  "reviewee_user_id",
  "review_type",
  "overall_rating",
  "title",
  "public_review",
  "verification_status",
  "publication_status",
  "status",
  "created_at",
  "updated_at",
];

export const nextTimestamp = (requestedAt, previousAt) =>
  Math.max(requestedAt, Number(previousAt) + 1);

const retryTransaction = async (dataSource, callback, attempt = 1) => {
  try {
    return await dataSource.transaction(callback);
  } catch (error) {
    const databaseError = error?.driverError || error;

    if (
      databaseError?.code !== "40001" ||
      attempt >= MAX_TRANSACTION_ATTEMPTS
    ) {
      throw error;
    }

    const delayMs = 25 * 2 ** (attempt - 1) + randomInt(25);

    await new Promise((resolve) => setTimeout(resolve, delayMs));

    return retryTransaction(dataSource, callback, attempt + 1);
  }
};

export function eligibleReviewQuery(database, propertyId) {
  return database.getRepository(Review).createQueryBuilder("review")
    .where(propertyId === undefined ? "1 = 1" : Array.isArray(propertyId) ? "review.property_id IN (:...propertyIds)" : "review.property_id = :propertyId",
      Array.isArray(propertyId) ? { propertyIds: propertyId } : { propertyId })
    .andWhere("review.publication_status = :publicationStatus", { publicationStatus: "PUBLISHED" })
    .andWhere("review.status = :status", { status: "PUBLISHED" })
    .andWhere("review.review_type = :reviewType", { reviewType: "GUEST_TO_PROPERTY" })
    .andWhere("review.overall_rating BETWEEN :minimum AND :maximum", { minimum: 1, maximum: 5 })
    .andWhere("review.overall_rating * 2 = FLOOR(review.overall_rating * 2)");
}

export async function runTransaction(callback) {
  const dataSource = await Database.getInstance();

  return retryTransaction(dataSource, callback);
}

export async function attachPublicDetails(dataSource, reviews, includeDrafts = false) {
  if (!reviews.length) return reviews;

  const reviewIds = reviews.map((review) => review.id);

  const [ratings, responses] = await Promise.all([
    dataSource.getRepository(Review_Rating).find({
      where: { reviewId: In(reviewIds) },
    }),
    dataSource.getRepository(Review_Response).find({
      where: {
        reviewId: In(reviewIds),
        status: includeDrafts ? In(["draft", "published"]) : "published",
        deletedAt: IsNull(),
      },
    }),
  ]);

  const ratingsByReview = groupRatings(ratings);
  const responsesByReview = new Map(
    responses.map((response) => [response.reviewId, response])
  );

  return reviews.map((review) => ({
    ...review,
    categoryRatings: ratingsByReview.get(review.id) || {},
    response: responsesByReview.get(review.id) || null,
  }));
}

function groupRatings(ratings) {
  const grouped = new Map();

  for (const rating of ratings) {
    if (!grouped.has(rating.reviewId)) {
      grouped.set(rating.reviewId, Object.create(null));
    }

    grouped.get(rating.reviewId)[rating.category] =
      Number(rating.rating);
  }

  return grouped;
}
