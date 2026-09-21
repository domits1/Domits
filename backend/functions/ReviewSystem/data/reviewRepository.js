// backend/functions/ReviewSystem/data/reviewRepository.js

import Database from "database";
import { Booking } from "database/models/Booking";
import { Review } from "database/models/Review";
import { Review_Rating } from "database/models/Review_Rating";
import { Review_Category } from "database/models/Review_Category";
import { Review_Request } from "database/models/Review_Request";
import { Review_Response } from "database/models/Review_Response";
import { Review_Private_Feedback } from "database/models/Review_Private_Feedback";
import { Review_Moderation } from "database/models/Review_Moderation";
import { Review_Verification } from "database/models/Review_Verification";
import { Team_Member } from "database/models/Team_Member";

class ReviewRepository {
  async getBookingById(bookingId) {
    const client = await Database.getInstance();

    return client
      .getRepository(Booking)
      .createQueryBuilder("booking")
      .where("booking.id = :bookingId", { bookingId })
      .getOne();
  }

  async getReviewById(reviewId) {
    const client = await Database.getInstance();

    const review = await client
      .getRepository(Review)
      .createQueryBuilder("review")
      .where("review.id = :reviewId", { reviewId })
      .getOne();

    if (!review) return null;

    const [reviewWithRatings] = await this.attachRatingsToReviews([review]);
    return reviewWithRatings;
  }

  async getReviewByBookingTypeAndReviewer({ bookingId, reviewType, reviewerUserId }) {
    const client = await Database.getInstance();

    return client
      .getRepository(Review)
      .createQueryBuilder("review")
      .where("review.booking_id = :bookingId", { bookingId })
      .andWhere("review.review_type = :reviewType", { reviewType })
      .andWhere("review.reviewer_user_id = :reviewerUserId", { reviewerUserId })
      .getOne();
  }

  async getActiveRatingCategoryKeys(reviewType) {
    const client = await Database.getInstance();

    const categories = await client
      .getRepository(Review_Category)
      .createQueryBuilder("category")
      .where("category.review_type = :reviewType", { reviewType })
      .andWhere("category.is_active = true")
      .getMany();

    return new Set(categories.map((category) => category.key));
  }

  async getPublishedReviewsByPropertyId(propertyId, options = {}) {
    const client = await Database.getInstance();

    const reviews = await client
      .getRepository(Review)
      .createQueryBuilder("review")
      .where("review.property_id = :propertyId", { propertyId })
      .andWhere("review.status = :status", { status: "PUBLISHED" })
      .orderBy("review.created_at", "DESC")
      .getMany();

    const reviewsWithRatings = await this.attachRatingsToReviews(reviews);
    const reviewsWithResponses = await this.attachResponsesToReviews(reviewsWithRatings, {
      includeDrafts: false,
    });

    return this.buildPublicReviewResponse(reviewsWithResponses, options);
  }

  buildPublicReviewResponse(reviews, options = {}) {
    const filteredReviews = this.applyPublicReviewFilters(reviews, options);
    const sortedReviews = this.sortPublicReviews(filteredReviews, options.sort || "recent");

    return {
      reviews: sortedReviews.map((review) => this.toPublicReview(review)),
      totalReviews: sortedReviews.length,
      overallRating: this.calculateAverage(sortedReviews.map((review) => review.overallRating)),
      categoryRatings: this.calculateCategoryAverages(sortedReviews),
    };
  }

  applyPublicReviewFilters(reviews, { verifiedOnly = false, category = null } = {}) {
    return reviews.filter((review) => {
      if (verifiedOnly && review.verificationStatus !== "VERIFIED_STAY") {
        return false;
      }

      if (category && review.categoryRatings?.[category] === undefined) {
        return false;
      }

      return true;
    });
  }

  sortPublicReviews(reviews, sort = "recent") {
    const sortedReviews = [...reviews];

    if (sort === "highest") {
      return sortedReviews.sort(
        (a, b) =>
          Number(b.overallRating) - Number(a.overallRating) ||
          Number(b.createdAt) - Number(a.createdAt)
      );
    }

    if (sort === "lowest") {
      return sortedReviews.sort(
        (a, b) =>
          Number(a.overallRating) - Number(b.overallRating) ||
          Number(b.createdAt) - Number(a.createdAt)
      );
    }

    return sortedReviews.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
  }

  async getReviewsByBookingForUser(bookingId, userId) {
    const client = await Database.getInstance();

    const reviews = await client
      .getRepository(Review)
      .createQueryBuilder("review")
      .where("review.booking_id = :bookingId", { bookingId })
      .andWhere("review.reviewer_user_id = :userId", { userId })
      .getMany();

    return this.attachRatingsToReviews(reviews);
  }

  async getReviewsWrittenByUser(userId) {
    const client = await Database.getInstance();

    const reviews = await client
      .getRepository(Review)
      .createQueryBuilder("review")
      .where("review.reviewer_user_id = :userId", { userId })
      .orderBy("review.created_at", "DESC")
      .getMany();

    return this.attachRatingsToReviews(reviews);
  }

  async getReviewsForHost(hostId) {
    const client = await Database.getInstance();

    const reviews = await client
      .getRepository(Review)
      .createQueryBuilder("review")
      .where("review.host_id = :hostId", { hostId })
      .orderBy("review.created_at", "DESC")
      .getMany();

    const reviewsWithRatings = await this.attachRatingsToReviews(reviews);
    return this.attachResponsesToReviews(reviewsWithRatings, { includeDrafts: true });
  }

  async hasActiveTeamMembership(memberUserId, hostId) {
    const client = await Database.getInstance();

    const membership = await client.getRepository(Team_Member).findOne({
      where: {
        member_user_id: memberUserId,
        host_id: hostId,
        status: "active",
      },
    });

    return Boolean(membership);
  }

  async getResponseByReviewId(reviewId, { includeDeleted = false } = {}) {
    const client = await Database.getInstance();

    const query = client
      .getRepository(Review_Response)
      .createQueryBuilder("response")
      .where("response.review_id = :reviewId", { reviewId });

    if (!includeDeleted) {
      query.andWhere("response.deleted_at IS NULL");
    }

    return query.getOne();
  }

  async saveReviewResponse(response) {
    const client = await Database.getInstance();
    return client.getRepository(Review_Response).save(response);
  }

  async updateReviewResponse(responseId, updateData) {
    const client = await Database.getInstance();

    await client.getRepository(Review_Response).update(responseId, updateData);

    return client.getRepository(Review_Response).findOne({
      where: { id: responseId },
    });
  }

  async getDomitsPrivateFeedbackForReview(reviewId) {
    const client = await Database.getInstance();

    return client
      .getRepository(Review_Private_Feedback)
      .createQueryBuilder("feedback")
      .where("feedback.review_id = :reviewId", { reviewId })
      .andWhere("feedback.feedback_type = :feedbackType", { feedbackType: "domits_private" })
      .orderBy("feedback.created_at", "DESC")
      .getMany();
  }

  async createReviewWithRatings(review, ratings, workflowRecords = {}) {
    const client = await Database.getInstance();

    return client.transaction(async (manager) => {
      const savedReview = await manager.getRepository(Review).save(review);

      if (ratings.length > 0) {
        await manager.getRepository(Review_Rating).save(ratings);
      }

      if (workflowRecords.reviewRequest) {
        await manager.getRepository(Review_Request).save(workflowRecords.reviewRequest);
      }

      if (workflowRecords.verification) {
        await manager.getRepository(Review_Verification).save(workflowRecords.verification);
      }

      if (workflowRecords.moderation) {
        await manager.getRepository(Review_Moderation).save(workflowRecords.moderation);
      }

      if (workflowRecords.domitsPrivateFeedback) {
        await manager.getRepository(Review_Private_Feedback).save(workflowRecords.domitsPrivateFeedback);
      }

      return {
        review: {
          ...savedReview,
          categoryRatings: this.mapRatingsByCategory(ratings),
        },
      };
    });
  }

  async updateReviewWithRatings(reviewId, updateData, ratings, workflowRecords = {}) {
    const client = await Database.getInstance();

    await client.transaction(async (manager) => {
      if (Object.keys(updateData).length > 0) {
        await manager.getRepository(Review).update(reviewId, updateData);
      }

      if (ratings) {
        await manager
          .getRepository(Review_Rating)
          .createQueryBuilder()
          .delete()
          .where("review_id = :reviewId", { reviewId })
          .execute();

        if (ratings.length > 0) {
          await manager.getRepository(Review_Rating).save(ratings);
        }
      }

      if (workflowRecords.reviewRequest) {
        await manager.getRepository(Review_Request).upsert(workflowRecords.reviewRequest, [
          "bookingId",
          "reviewType",
          "guestId",
        ]);
      }

      if (workflowRecords.verification) {
        await manager.getRepository(Review_Verification).upsert(workflowRecords.verification, ["reviewId"]);
      }

      if (workflowRecords.moderation) {
        await manager.getRepository(Review_Moderation).save(workflowRecords.moderation);
      }
    });

    return this.getReviewById(reviewId);
  }

  async softDeleteReview(reviewId) {
    const client = await Database.getInstance();

    await client.getRepository(Review).update(reviewId, {
      status: "REJECTED",
      publicationStatus: "REJECTED",
      updatedAt: Date.now(),
    });

    return { message: "Review deleted successfully." };
  }

  async attachRatingsToReviews(reviews) {
    if (reviews.length === 0) return reviews;

    const client = await Database.getInstance();
    const reviewIds = reviews.map((review) => review.id);

    const ratings = await client
      .getRepository(Review_Rating)
      .createQueryBuilder("rating")
      .where("rating.review_id IN (:...reviewIds)", { reviewIds })
      .getMany();

    const ratingsByReviewId = ratings.reduce((acc, rating) => {
      acc[rating.reviewId] = acc[rating.reviewId] || [];
      acc[rating.reviewId].push(rating);
      return acc;
    }, {});

    return reviews.map((review) => ({
      ...review,
      categoryRatings: this.mapRatingsByCategory(ratingsByReviewId[review.id] || []),
    }));
  }

  async attachResponsesToReviews(reviews, { includeDrafts = false } = {}) {
    if (reviews.length === 0) return reviews;

    const client = await Database.getInstance();
    const reviewIds = reviews.map((review) => review.id);

    const query = client
      .getRepository(Review_Response)
      .createQueryBuilder("response")
      .where("response.review_id IN (:...reviewIds)", { reviewIds })
      .andWhere("response.deleted_at IS NULL");

    if (!includeDrafts) {
      query.andWhere("response.status = :status", { status: "published" });
    }

    const responses = await query.getMany();
    const responseByReviewId = responses.reduce((acc, response) => {
      acc[response.reviewId] = response;
      return acc;
    }, {});

    return reviews.map((review) => ({
      ...review,
      response: responseByReviewId[review.id] || null,
    }));
  }

  mapRatingsByCategory(ratings) {
    return ratings.reduce((acc, rating) => {
      acc[rating.category] = Number(rating.rating);
      return acc;
    }, {});
  }

  toPublicReview(review) {
    return {
      id: review.id,
      overallRating: review.overallRating,
      title: review.title,
      publicReview: review.publicReview,
      verificationStatus: review.verificationStatus,
      status: review.status,
      createdAt: review.createdAt,
      categoryRatings: review.categoryRatings || {},
      response:
        review.response && review.response.status === "published" && !review.response.deletedAt
          ? {
              id: review.response.id,
              authorRole: review.response.authorRole,
              message: review.response.message,
              publishedAt: review.response.publishedAt,
            }
          : null,
    };
  }

  calculateAverage(values) {
    const numbers = values.map(Number).filter(Number.isFinite);
    if (numbers.length === 0) return null;

    const average = numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
    return Math.round(average * 10) / 10;
  }

  calculateCategoryAverages(reviews) {
    const groupedRatings = {};

    reviews.forEach((review) => {
      Object.entries(review.categoryRatings || {}).forEach(([category, rating]) => {
        groupedRatings[category] = groupedRatings[category] || [];
        groupedRatings[category].push(Number(rating));
      });
    });

    return Object.fromEntries(
      Object.entries(groupedRatings).map(([category, values]) => [category, this.calculateAverage(values)])
    );
  }
}

export default ReviewRepository;
