import { randomUUID } from "node:crypto";
import { In } from "typeorm";
import Database from "database";
import { Booking } from "database/models/Booking";
import { Property } from "database/models/Property";
import { Property_Location } from "database/models/Property_Location";
import { Property_Image } from "database/models/Property_Image";
import { Property_Image_Variant } from "database/models/Property_Image_Variant";
import { Review } from "database/models/Review";
import { Review_Rating } from "database/models/Review_Rating";
import { Review_Category } from "database/models/Review_Category";
import { Review_Request } from "database/models/Review_Request";
import { Team_Member } from "database/models/Team_Member";
import { ConflictException } from "../util/exception/conflictException.js";
import { ForbiddenException } from "../util/exception/forbiddenException.js";
import { assertEligibleBooking } from "../business/model/reviewRules.js";
import { HostReviewRepository } from "./hostReviewRepository.js";
import { PublicReviewRepository } from "./publicReviewRepository.js";
import { nextTimestamp, REVIEW_FIELDS, runTransaction } from "./reviewRepositoryShared.js";

const REVIEW_REQUEST_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

const isMatchingDraft = (review, expectedUpdatedAt) =>
  review?.status === "DRAFT" &&
  review.publication_status === "UNPUBLISHED" &&
  review.updated_at === expectedUpdatedAt;

const buildRatingRecords = (reviewId, categoryRatings, createdAt) =>
  Object.entries(categoryRatings).map(([category, rating]) => ({
    id: randomUUID(),
    reviewId,
    category,
    rating,
    createdAt,
  }));

export class ReviewRepository {
  #hostReviews = new HostReviewRepository();
  #publicReviews = new PublicReviewRepository();

  async findResponseEligibleReviews(username) {
    return this.#hostReviews.findResponseEligibleReviews(username);
  }

  async saveHostResponse(user, reviewId, message, action, now) {
    return this.#hostReviews.saveHostResponse(user, reviewId, message, action, now);
  }

  async deleteHostResponse(user, reviewId, deletedAt) {
    return this.#hostReviews.deleteHostResponse(user, reviewId, deletedAt);
  }

  async getPropertyReviewPerformance(propertyId, hostId, start, endExclusive, interval) {
    return this.#hostReviews.getPropertyReviewPerformance(propertyId, hostId, start, endExclusive, interval);
  }

  async getPropertyCategoryRatings(propertyId, hostId) {
    return this.#hostReviews.getPropertyCategoryRatings(propertyId, hostId);
  }

  async findManagedProperty(propertyId, hostId) {
    return this.#hostReviews.findManagedProperty(propertyId, hostId);
  }

  async getPropertyRatingHistory(hostId, propertyIds, options) {
    return this.#hostReviews.getPropertyRatingHistory(hostId, propertyIds, options);
  }

  async getPropertyRatingTrendPage(hostId, options) {
    return this.#hostReviews.getPropertyRatingTrendPage(hostId, options);
  }

  async getPropertyReviewScore(propertyId, hostId) {
    return this.#hostReviews.getPropertyReviewScore(propertyId, hostId);
  }

  async createResponse(record) {
    return this.#hostReviews.createResponse(record);
  }

  async updateResponse(changes) {
    return this.#hostReviews.updateResponse(changes);
  }

  async softDeleteResponse(changes) {
    return this.#hostReviews.softDeleteResponse(changes);
  }

  async getPublicReviewPage(propertyId, offset) {
    return this.#publicReviews.getPublicReviewPage(propertyId, offset);
  }

  async findReviews(where) {
    return this.#publicReviews.findReviews(where);
  }

  async findPublicForProperty(propertyId, pagination) {
    return this.#publicReviews.findPublicForProperty(propertyId, pagination);
  }

  async findPublicPropertyReviews(propertyId, options) {
    return this.#publicReviews.findPublicPropertyReviews(propertyId, options);
  }

  async findReviewById(id) {
    const dataSource = await Database.getInstance();
    return dataSource.getRepository(Review).findOne({ where: { id } });
  }

  async updateEditableReview({ id, guestId, previousUpdatedAt, editWindowMs,
    now, overallRating, publicReview }) {
    const dataSource = await Database.getInstance();
    const timestamp = now();
    const updatedAt = Math.max(timestamp, previousUpdatedAt + 1);
    // Check ownership, the original deadline, and version in the same write.
    const result = await dataSource.getRepository(Review).createQueryBuilder()
      .update(Review)
      .set({ overall_rating: overallRating, public_review: publicReview, updated_at: updatedAt,
        status: "DRAFT", publication_status: "UNPUBLISHED" })
      .where("id = :id AND reviewer_user_id = :guestId", { id, guestId })
      .andWhere("updated_at = :previousUpdatedAt", { previousUpdatedAt })
      .andWhere("created_at <= :timestamp AND created_at > :cutoff", {
        timestamp, cutoff: timestamp - editWindowMs,
      })
      .andWhere("status = :draft AND publication_status = :unpublished", { draft: "DRAFT", unpublished: "UNPUBLISHED" })
      .execute();
    return { affected: result.affected, updated_at: updatedAt };
  }

  // Creation

  // Create a review and persist its rating breakdown.
  // This keeps the review record, category ratings, and request state in one transactional unit.
  async create(record, categoryRatings = {}) {
    return runTransaction(async (manager) => {
      const review = await this.saveReview(manager, record);

      await this.saveCategoryRatings(
        manager,
        record.id,
        categoryRatings,
        record.created_at
      );

      await this.createReviewRequestIfMissing(manager, record);

      return review;
    });
  }

  async saveReview(manager, record) {
    return manager.getRepository(Review).save(record);
  }

  async saveCategoryRatings(
    manager,
    reviewId,
    categoryRatings,
    createdAt
  ) {
    const ratings = buildRatingRecords(
      reviewId,
      categoryRatings,
      createdAt
    );

    if (!ratings.length) return;

    await manager.getRepository(Review_Rating).save(ratings);
  }

  async createReviewRequestIfMissing(manager, record) {
    // Preserve existing request status, identity, and timing.
    await manager
      .getRepository(Review_Request)
      .createQueryBuilder()
      .insert()
      .values({
        id: randomUUID(),
        bookingId: record.booking_id,
        propertyId: record.property_id,
        hostId: record.host_id,
        guestId: record.reviewer_user_id,
        reviewType: record.review_type,
        status: "OPEN",
        requestedAt: record.created_at,
        expiresAt:
          record.created_at + REVIEW_REQUEST_DURATION_MS,
        completedAt: null,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
      })
      .orIgnore()
      .execute();
  }

  // Reads

  async findById(id) {
    const dataSource = await Database.getInstance();

    return dataSource.getRepository(Review).findOne({
      where: { id },
    });
  }

  async findBookingById(bookingId) {
    const dataSource = await Database.getInstance();

    return dataSource.getRepository(Booking).findOne({
      where: { id: bookingId },
    });
  }

  async findReviewByBookingTypeAndReviewer(key) {
    const dataSource = await Database.getInstance();

    return dataSource.getRepository(Review).findOne({
      where: key,
      select: ["id"],
    });
  }

  async findActiveCategoryKeys(reviewType) {
    const dataSource = await Database.getInstance();

    return this.loadActiveCategoryKeys(dataSource, reviewType);
  }

  async loadActiveCategoryKeys(manager, reviewType) {
    const categories = await manager
      .getRepository(Review_Category)
      .find({
        where: { reviewType, isActive: true },
        select: ["key"],
      });

    return new Set(categories.map((category) => category.key));
  }

  async hasActiveReviewApproverRole(username, roles, manager) {
    const database = manager ?? await Database.getInstance();

    return database.getRepository(Team_Member)
      .createQueryBuilder("member")
      .where("member.member_user_id = :username", { username })
      .andWhere("member.status = :status", { status: "active" })
      .andWhere("member.role IN (:...roles)", { roles })
      .getExists();
  }

  async findUnpublishedReviews(status) {
    const database = await Database.getInstance();
    const reviews = await database.getRepository(Review).find({
      where: { review_type: "GUEST_TO_PROPERTY", status, publication_status: "UNPUBLISHED" },
      select: REVIEW_FIELDS, order: { created_at: "ASC", id: "ASC" }, take: 100,
    });
    if (status !== "PENDING_APPROVAL" || !reviews.length) return reviews;

    const propertyIds = [...new Set(reviews.map((review) => review.property_id))];
    const [properties, locations, imageKeys, bookings] = await Promise.all([
      database.getRepository(Property).find({ where: { id: In(propertyIds) }, select: ["id", "title"] }),
      database.getRepository(Property_Location).find({
        where: { property_id: In(propertyIds) }, select: ["property_id", "city", "country"] }),
      this.findFirstImageKeys(database, propertyIds),
      database.getRepository(Booking).find({
        where: { id: In([...new Set(reviews.map((review) => review.booking_id))]) },
        select: ["id", "guestid", "guestname"] }),
    ]);
    const titles = new Map(properties.map((property) => [property.id, property.title]));
    const locationsById = new Map(locations.map((location) => [location.property_id, location]));
    const bookingsById = new Map(bookings.map((booking) => [booking.id, booking]));

    return reviews.map((review) => {
      const location = locationsById.get(review.property_id);
      const booking = bookingsById.get(review.booking_id);
      // A booking name only identifies the reviewer when that guest made the booking.
      const bookedByReviewer = Boolean(booking) && booking.guestid === review.reviewer_user_id;
      const guestName = bookedByReviewer ? booking.guestname?.trim() || null : null;
      return { ...review, property_title: titles.get(review.property_id) ?? null,
        property_city: location?.city ?? null, property_country: location?.country ?? null,
        property_image_key: imageKeys.get(review.property_id) ?? null, guest_name: guestName };
    });
  }

  async findFirstImageKeys(database, propertyIds) {
    const images = await database.getRepository(Property_Image).find({
      where: { property_id: In(propertyIds), status: "READY" },
      select: ["id", "property_id", "sort_order"], order: { sort_order: "ASC" },
    });
    const firstImageByProperty = new Map();
    for (const image of images) {
      if (!firstImageByProperty.has(image.property_id)) firstImageByProperty.set(image.property_id, image.id);
    }
    if (!firstImageByProperty.size) return new Map();

    const variants = await database.getRepository(Property_Image_Variant).find({
      where: { image_id: In([...firstImageByProperty.values()]), variant: In(["thumb", "web"]) },
      select: ["image_id", "variant", "s3_key"],
    });
    const keyFor = (imageId, variant) =>
      variants.find((entry) => entry.image_id === imageId && entry.variant === variant)?.s3_key;
    return new Map([...firstImageByProperty].map(([propertyId, imageId]) =>
      [propertyId, keyFor(imageId, "thumb") ?? keyFor(imageId, "web") ?? null]));
  }

  async findForUser(userId, scope) {
    const dataSource = await Database.getInstance();
    const field =
      scope === "written"
        ? "review.reviewer_user_id"
        : "review.reviewee_user_id";

    const query = dataSource
      .getRepository(Review)
      .createQueryBuilder("review")
      .where(`${field} = :userId`, { userId })
      .andWhere("review.status NOT IN (:...excluded)", {
        excluded: ["DELETED", "REJECTED"],
      })
      .orderBy("review.created_at", "DESC")
      .addOrderBy("review.id", "DESC");

    if (scope === "received") {
      query
        .andWhere("review.publication_status = :published", {
          published: "PUBLISHED",
        })
        .andWhere("review.status = :publishedStatus", {
          publishedStatus: "PUBLISHED",
        });
    }

    const reviews = await query.getMany();
    if (scope !== "received" || !reviews.length) return reviews;
    const bookings = await dataSource.getRepository(Booking).find({
      where: { id: In([...new Set(reviews.map((review) => review.booking_id))]) },
      select: ["id", "guestid", "guestname"],
    });
    const byId = new Map(bookings.map((booking) => [booking.id, booking]));
    return reviews.map((review) => {
      const booking = byId.get(review.booking_id);
      return { ...review, guest_name: booking?.guestid === review.reviewer_user_id
        ? booking.guestname?.trim() || null : null };
    });
  }

  // Updates

  // Update a draft review without overwriting someone else's changes.
  // This protects the optimistic concurrency flow and ensures category edits stay synchronized.
  async updateDraft({
    reviewId,
    reviewerUserId,
    expectedUpdatedAt,
    fields,
    categoryRatings,
  }) {
    return runTransaction(async (manager) => {
      const reviews = manager.getRepository(Review);
      const current = await reviews.findOne({
        where: { id: reviewId },
      });

      if (
        !isMatchingDraft(current, expectedUpdatedAt) ||
        current.reviewer_user_id !== reviewerUserId
      ) {
        return null;
      }

      const updates = {
        ...fields,
        updated_at: nextTimestamp(
          fields.updated_at,
          current.updated_at
        ),
      };

      const result = await reviews.update(
        {
          id: reviewId,
          reviewer_user_id: reviewerUserId,
          status: "DRAFT",
          publication_status: "UNPUBLISHED",
          updated_at: expectedUpdatedAt,
        },
        updates
      );

      if (result.affected !== 1) return null;

      if (categoryRatings !== undefined) {
        await this.replaceCategoryRatings(
          manager,
          current,
          categoryRatings,
          updates.updated_at
        );
      }

      return { ...current, ...updates };
    });
  }

  async replaceCategoryRatings(
    manager,
    review,
    categoryRatings,
    updatedAt
  ) {
    const supported = await this.loadActiveCategoryKeys(
      manager,
      review.review_type
    );

    if (
      Object.keys(categoryRatings).some(
        (key) => !supported.has(key)
      )
    ) {
      throw new ConflictException(
        "Rating categories changed. Reload before editing."
      );
    }

    await manager.getRepository(Review_Rating).delete({
      reviewId: review.id,
    });

    await this.saveCategoryRatings(
      manager,
      review.id,
      categoryRatings,
      updatedAt
    );
  }

  // Deletion

  async softDelete(id, reviewerUserId, updatedAt) {
    const dataSource = await Database.getInstance();

    return dataSource
      .getRepository(Review)
      .createQueryBuilder()
      .update(Review)
      .set({ status: "DELETED", updated_at: updatedAt })
      .where("id = :id", { id })
      .andWhere("reviewer_user_id = :reviewerUserId", {
        reviewerUserId,
      })
      .andWhere("status NOT IN (:...excluded)", {
        excluded: ["DELETED", "REJECTED"],
      })
      .execute();
  }

  async deleteOwnReview(id, reviewerUserId, now) {
    const dataSource = await Database.getInstance();

    return dataSource.getRepository(Review).update(
      { id, reviewer_user_id: reviewerUserId },
      {
        status: "REJECTED",
        publication_status: "REJECTED",
        updated_at: now,
      }
    );
  }

  // Publication

  // Publish a draft review after the eligibility checks pass.
  // This finalizes the review and closes the request lifecycle only when the booking is still valid.
  async publishDraft({
    reviewId,
    expectedUpdatedAt,
    updatedAt,
    authorize,
    from = "APPROVED", to = "PUBLISHED", validate = () => {},
  }) {
    return runTransaction(async (manager) => {
      const reviews = manager.getRepository(Review);
      const review = await reviews.findOne({
        where: { id: reviewId },
      });

      if (!review || review.status !== from || review.publication_status !== "UNPUBLISHED"
        || review.updated_at !== expectedUpdatedAt) {
        return null;
      }

      const transitions = { DRAFT: "PENDING_APPROVAL", PENDING_APPROVAL: "APPROVED", APPROVED: "PUBLISHED" };
      if (!Object.hasOwn(transitions, from) || transitions[from] !== to) {
        throw new ConflictException("Invalid review transition.");
      }
      validate(review);
      await this.assertPublicationAllowed(
        manager,
        review,
        updatedAt,
        authorize
      );

      const timestamp = nextTimestamp(
        updatedAt,
        review.updated_at
      );

      const updates = {
        status: to,
        publication_status: to === "PUBLISHED" ? "PUBLISHED" : "UNPUBLISHED",
        updated_at: timestamp,
      };

      const result = await reviews.update(
        {
          id: reviewId,
          status: from,
          publication_status: "UNPUBLISHED",
          updated_at: expectedUpdatedAt,
        },
        updates
      );

      if (result.affected !== 1) return null;

      if (to === "PUBLISHED") await this.completeReviewRequest(
        manager,
        review,
        timestamp
      );

      return { ...review, ...updates };
    });
  }

  async assertPublicationAllowed(
    manager,
    review,
    updatedAt,
    authorize
  ) {
    if (
      typeof authorize !== "function" ||
      !(await authorize(review, manager))
    ) {
      throw new ForbiddenException(
        "You cannot publish this review."
      );
    }

    const booking = await manager.getRepository(Booking).findOne({
      where: { id: review.booking_id },
    });

    assertEligibleBooking(
      booking,
      review.reviewer_user_id,
      updatedAt
    );

    if (
      String(booking.property_id) !== String(review.property_id) ||
      String(booking.hostid) !== String(review.host_id)
    ) {
      throw new ConflictException(
        "The reservation is no longer eligible for publication."
      );
    }
  }

  async completeReviewRequest(manager, review, timestamp) {
    await manager.getRepository(Review_Request).update(
      {
        bookingId: review.booking_id,
        reviewType: review.review_type,
        guestId: review.reviewer_user_id,
        status: "OPEN",
      },
      {
        status: "COMPLETED",
        completedAt: timestamp,
        updatedAt: timestamp,
        nextSendAt: null,
        claimedAt: null,
      }
    );
  }
}
