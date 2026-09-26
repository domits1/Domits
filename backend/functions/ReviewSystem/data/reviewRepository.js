// backend/functions/ReviewSystem/data/reviewRepository.js

import Database from "database";
import { Booking } from "database/models/Booking";
import { Review } from "database/models/Review";
import { Review_Rating } from "database/models/Review_Rating";
import { Review_Category } from "database/models/Review_Category";
import { Review_Request } from "database/models/Review_Request";
import { Review_Moderation } from "database/models/Review_Moderation";
import { Review_Verification } from "database/models/Review_Verification";

// Review: Provides transactional storage and read models for reviews, ratings, and workflow records.
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

  async getPublishedReviewsByPropertyId(propertyId) {
    // Review: Produces the public review list and its overall and category rating summaries.
    const client = await Database.getInstance();

    const reviews = await client
      .getRepository(Review)
      .createQueryBuilder("review")
      .where("review.property_id = :propertyId", { propertyId })
      .andWhere("review.status = :status", { status: "PUBLISHED" })
      .orderBy("review.created_at", "DESC")
      .getMany();

    const reviewsWithRatings = await this.attachRatingsToReviews(reviews);

    return {
      reviews: reviewsWithRatings.map((review) => this.toPublicReview(review)),
      totalReviews: reviewsWithRatings.length,
      overallRating: this.calculateAverage(reviewsWithRatings.map((review) => review.overallRating)),
      categoryRatings: this.calculateCategoryAverages(reviewsWithRatings),
    };
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

  async createReviewWithRatings(review, ratings, workflowRecords = {}) {
    // Review: Saves a review and all related records atomically so partial submissions cannot persist.
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

      return {
        review: {
          ...savedReview,
          categoryRatings: this.mapRatingsByCategory(ratings),
        },
      };
    });
  }

  async updateReviewWithRatings(reviewId, updateData, ratings, workflowRecords = {}) {
    // Review: Updates content, ratings, and lifecycle records in one transaction.
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
    // Review: Hydrates review rows with the category-rating shape expected by API clients.
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

  mapRatingsByCategory(ratings) {
    return ratings.reduce((acc, rating) => {
      acc[rating.category] = Number(rating.rating);
      return acc;
    }, {});
  }

  toPublicReview(review) {
    // Review: Removes private feedback and account identifiers from public review responses.
    return {
      id: review.id,
      overallRating: review.overallRating,
      title: review.title,
      publicReview: review.publicReview,
      verificationStatus: review.verificationStatus,
      status: review.status,
      createdAt: review.createdAt,
      categoryRatings: review.categoryRatings || {},
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
