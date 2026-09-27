// Review: backend/functions/ReviewSystem/data/reviewRepository.js

import Database from "database";
import { randomUUID } from "node:crypto";
import { Booking } from "database/models/Booking";
import { Review } from "database/models/Review";
import { Review_Rating } from "database/models/Review_Rating";
import { Review_Category } from "database/models/Review_Category";
import { Review_Request } from "database/models/Review_Request";
import { Review_Response } from "database/models/Review_Response";
import { Review_Private_Feedback } from "database/models/Review_Private_Feedback";
import { Review_Moderation } from "database/models/Review_Moderation";
import { Review_Verification } from "database/models/Review_Verification";
import { Review_Notification_Preference } from "database/models/Review_Notification_Preference";
import { Team_Member } from "database/models/Team_Member";
import { REVIEW_MAX_EMAILS, REVIEW_REMINDER_DAYS, REVIEW_REQUEST_DELAY_HOURS, REVIEW_WINDOW_DAYS } from "../util/reviewPolicy.js";
import ConflictException from "../util/exception/conflictException.js";

// Review: Database access layer for review creation, publication, moderation, responses, and reminders.
class ReviewRepository {
  async listBookingsNeedingReviewRequests(now, limit) {
    // Review: Finds completed stays that still need an invitation to leave a review.
    const client = await Database.getInstance();
    const query = client.getRepository(Booking).createQueryBuilder("booking");
    const existingRequest = query.subQuery().select("1").from(Review_Request, "request")
      .where("request.booking_id = booking.id")
      .andWhere("request.review_type = :type")
      .andWhere("request.guest_id = booking.guestid").getQuery();
    return query
      .where("LOWER(booking.status) = :status", { status: "completed" })
      .andWhere("booking.departuredate <= :cutoff", { cutoff: now - REVIEW_REQUEST_DELAY_HOURS * 60 * 60 * 1000 })
      .andWhere("booking.departuredate >= :oldest", { oldest: now - REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000 })
      .andWhere(`NOT EXISTS ${existingRequest}`, { type: "GUEST_TO_PROPERTY" })
      .orderBy("booking.departuredate", "ASC").take(limit).getMany();
  }

  async createReviewRequestForBooking(booking, now) {
    // Review: Creates an open review request tied to one completed booking.
    const client = await Database.getInstance();

    const request = {
      id: randomUUID(),
      bookingId: booking.id,
      propertyId: booking.property_id,
      hostId: booking.hostid,
      guestId: booking.guestid,
      reviewType: "GUEST_TO_PROPERTY",
      status: "OPEN",
      requestedAt: now,
      expiresAt:
        Number(booking.departuredate) +
        REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000,
      sendCount: 0,
      nextSendAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await client
      .getRepository(Review_Request)
      .createQueryBuilder()
      .insert()
      .values(request)
      .orIgnore()
      .execute();
  }

  async listDueReviewRequests(now, limit) {
    // Review: Pulls open review reminders that are due and not already claimed by another worker.
    const client = await Database.getInstance();
    return client.getRepository(Review_Request).createQueryBuilder("request")
      .where("request.status = :status", { status: "OPEN" })
      .andWhere("request.next_send_at <= :now", { now })
      .andWhere("request.expires_at > :now", { now })
      .andWhere("COALESCE(request.send_count, 0) < :maxSends", { maxSends: REVIEW_MAX_EMAILS })
      .andWhere("(request.claimed_at IS NULL OR request.claimed_at < :stale)", { stale: now - 10 * 60 * 1000 })
      .orderBy("request.next_send_at", "ASC").take(limit).getMany();
  }

  async claimReviewRequest(id, now) {
    // Review: Locks a due review request so concurrent schedulers do not send duplicate emails.
    const client = await Database.getInstance();
    const result = await client.getRepository(Review_Request).createQueryBuilder().update()
      .set({ claimedAt: now }).where("id = :id AND status = 'OPEN' AND next_send_at <= :now AND (claimed_at IS NULL OR claimed_at < :stale)",
        { id, now, stale: now - 10 * 60 * 1000 }).execute();
    return result.affected === 1;
  }

  async finishReviewRequestSend(id, now, success) {
    // Review: Advances a sent request to its next reminder time or schedules a short retry.
    const client = await Database.getInstance();
    await client.getRepository(Review_Request).createQueryBuilder().update()
      .set(
        success
          ? {
              claimedAt: null,
              lastSentAt: now,
              sendCount: () => "COALESCE(send_count, 0) + 1",
              nextSendAt:
                now + REVIEW_REMINDER_DAYS * 24 * 60 * 60 * 1000,
              updatedAt: now,
            }
          : {
              claimedAt: null,
              nextSendAt: now + 60 * 60 * 1000,
              updatedAt: now,
            }
      )
      .where("id = :id AND status = 'OPEN'", { id }).execute();
  }

  async suppressReviewRequest(id, now) {
    // Review: Stops a review request when the stay, preference, or duplicate state no longer qualifies.
    const client = await Database.getInstance();
    await client.getRepository(Review_Request).createQueryBuilder().update()
      .set({ status: "SUPPRESSED", claimedAt: null, nextSendAt: null, updatedAt: now })
      .where("id = :id AND status = 'OPEN'", { id }).execute();
  }

  async getReviewNotificationPreference(userId) {
    // Review: Reads whether a guest wants review request emails.
    const client = await Database.getInstance();
    const row = await client.getRepository(Review_Notification_Preference).findOne({ where: { userId } });
    return { emailEnabled: row?.emailEnabled !== false };
  }

  async saveReviewNotificationPreference(userId, emailEnabled, now) {
    // Review: Persists review email preferences and reopens suppressed requests when email is re-enabled.
    const client = await Database.getInstance();
    await client.getRepository(Review_Notification_Preference).upsert({ userId, emailEnabled, updatedAt: now }, ["userId"]);
    if (emailEnabled) {
      await client.getRepository(Review_Request).createQueryBuilder().update()
        .set({ status: "OPEN", nextSendAt: now, updatedAt: now })
        .where("guest_id = :userId AND status = 'SUPPRESSED' AND expires_at > :now", { userId, now }).execute();
    }
    return { emailEnabled };
  }

  async listModerationQueue(limit = 50) {
    // Review: Loads submitted and verified reviews that still need a moderator decision.
    const client = await Database.getInstance();
    const reviews = await client.getRepository(Review).createQueryBuilder("review")
      .where("review.status IN (:...statuses)", { statuses: ["SUBMITTED", "VERIFIED", "PENDING_MODERATION"] })
      .orderBy("review.created_at", "ASC").take(limit).getMany();
    return this.attachRatingsToReviews(reviews);
  }

  async getReviewModerationHistory(reviewId) {
    const client = await Database.getInstance();
    return client.getRepository(Review_Moderation).createQueryBuilder("moderation")
      .where("moderation.review_id = :reviewId", { reviewId })
      .orderBy("moderation.created_at", "ASC").getMany();
  }

  async getReviewVerification(reviewId) {
    const client = await Database.getInstance();
    return client.getRepository(Review_Verification).findOne({ where: { reviewId } });
  }

  async decideReview({ reviewId, expectedStatus, status, verification, moderation, now }) {
    // Review: Atomically applies moderation status, verification evidence, and moderation history.
    const client = await Database.getInstance();
    await client.transaction(async (manager) => {
      const result = await manager.getRepository(Review).createQueryBuilder().update()
        .set({ status, verificationStatus: verification.status === "VERIFIED_STAY" ? "VERIFIED_STAY" : "UNVERIFIED",
          publicationStatus: status === "PUBLISHED" ? "PUBLISHED" : status === "REJECTED" ? "REJECTED" : "UNPUBLISHED",
          updatedAt: now })
        .where("id = :reviewId AND status = :expectedStatus", { reviewId, expectedStatus }).execute();
      if (result.affected !== 1) throw new ConflictException("Review changed during moderation. Please reload.");
      await manager.getRepository(Review_Verification).upsert(verification, ["reviewId"]);
      await manager.getRepository(Review_Moderation).save(moderation);
    });
    return this.getReviewById(reviewId);
  }
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
    // Review: Returns only published public reviews with ratings and published host responses.
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

  async getRecentReviewsByReviewer(reviewerUserId, now) {
    const client = await Database.getInstance();
    return client.getRepository(Review).createQueryBuilder("review")
      .where("review.reviewer_user_id = :reviewerUserId", { reviewerUserId })
      .andWhere("review.created_at >= :since", { since: now - 30 * 24 * 60 * 60 * 1000 })
      .orderBy("review.created_at", "DESC").take(100).getMany();
  }

  buildPublicReviewResponse(reviews, options = {}) {
    // Review: Builds the public listing summary after filters and sorting have been applied.
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
    // Review: Loads host-visible reviews and includes draft responses so hosts can continue editing.
    const client = await Database.getInstance();

    const reviews = await client
      .getRepository(Review)
      .createQueryBuilder("review")
      .where("review.host_id = :hostId", { hostId })
      .andWhere("review.status IN (:...statuses)", {
        statuses: ["SUBMITTED", "VERIFIED", "PENDING_MODERATION", "PUBLISHED"],
      })
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

  async listDomitsPrivateFeedback(limit = 100) {
    const client = await Database.getInstance();

    return client
      .getRepository(Review_Private_Feedback)
      .createQueryBuilder("feedback")
      .where("feedback.feedback_type = :feedbackType", { feedbackType: "domits_private" })
      .orderBy("feedback.created_at", "DESC")
      .take(limit)
      .getMany();
  }

  async createReviewWithRatings(review, ratings, workflowRecords = {}) {
    // Review: Saves a review and all workflow side records in one transaction.
    const client = await Database.getInstance();

    return client.transaction(async (manager) => {
      const savedReview = await manager.getRepository(Review).save(review);

      if (ratings.length > 0) {
        await manager.getRepository(Review_Rating).save(ratings);
      }

      if (workflowRecords.reviewRequest) {
        await manager.getRepository(Review_Request).createQueryBuilder().insert()
          .values(workflowRecords.reviewRequest).orIgnore().execute();
        if (workflowRecords.reviewRequest.status === "COMPLETED") {
          await manager.getRepository(Review_Request).createQueryBuilder().update()
            .set({ status: "COMPLETED", completedAt: review.createdAt, nextSendAt: null, updatedAt: review.createdAt })
            .where("booking_id = :bookingId AND review_type = :reviewType AND guest_id = :guestId", {
              bookingId: review.bookingId, reviewType: review.reviewType, guestId: review.reviewerUserId,
            }).execute();
        }
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
    // Review: Updates review content, ratings, verification, and moderation records together.
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
        await manager.getRepository(Review_Request).createQueryBuilder().insert()
          .values(workflowRecords.reviewRequest).orIgnore().execute();
        if (workflowRecords.reviewRequest.status === "COMPLETED") {
          await manager.getRepository(Review_Request).createQueryBuilder().update()
            .set({ status: "COMPLETED", completedAt: updateData.updatedAt, nextSendAt: null, updatedAt: updateData.updatedAt })
            .where("booking_id = :bookingId AND review_type = :reviewType AND guest_id = :guestId", {
              bookingId: workflowRecords.reviewRequest.bookingId,
              reviewType: workflowRecords.reviewRequest.reviewType,
              guestId: workflowRecords.reviewRequest.guestId,
            }).execute();
        }
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
    // Review: Hydrates review rows with their category ratings for API responses.
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
    // Review: Hydrates review rows with host responses, optionally including drafts for host dashboards.
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
    // Review: Removes private review fields before returning data to listing pages.
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
