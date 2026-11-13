import { randomUUID } from "node:crypto";
import { IsNull } from "typeorm";
import Database from "database";
import { Property } from "database/models/Property";
import { Review } from "database/models/Review";
import { Review_Rating } from "database/models/Review_Rating";
import { Review_Category } from "database/models/Review_Category";
import { Review_Response } from "database/models/Review_Response";
import { Team_Member } from "database/models/Team_Member";
import { NotFoundException } from "../util/exception/notFoundException.js";
import { ConflictException } from "../util/exception/conflictException.js";
import { assertHostResponseAccess } from "../business/model/reviewRules.js";
import { attachPublicDetails, eligibleReviewQuery, nextTimestamp, REVIEW_FIELDS, runTransaction } from "./reviewRepositoryShared.js";

export class HostReviewRepository {
  hostResponseQuery(database, username) {
    return eligibleReviewQuery(database)
      .innerJoin(Property, "property", "property.id = review.property_id")
      .leftJoin(Team_Member, "member", "member.host_id = property.hostid AND member.member_user_id = :username AND member.status = :active AND member.role = :role",
        { username, active: "active", role: "Property Operations Manager" })
      .andWhere("(property.hostid = :username OR member.id IS NOT NULL)", { username })
      .andWhere("property.status = :propertyStatus", { propertyStatus: "ACTIVE" })
      .andWhere("TRIM(review.public_review) <> ''");
  }

  async findResponseEligibleReviews(username) {
    const database = await Database.getInstance();
    const reviews = await this.hostResponseQuery(database, username)
      .select(REVIEW_FIELDS.map((field) => `review.${field}`)).orderBy("review.created_at", "DESC").getMany();
    return attachPublicDetails(database, reviews);
  }

  async saveHostResponse(user, reviewId, message, action, now) {
    try {
      return await runTransaction(async (manager) => {
        const review = await this.hostResponseQuery(manager, user.username).andWhere("review.id = :reviewId", { reviewId }).getOne();
        if (!review) throw new NotFoundException("An eligible review you can respond to was not found.");
        const repository = manager.getRepository(Review_Response);
        const existing = await repository.findOne({ where: { reviewId } });
        if (action === "edit" && (!existing || existing.deletedAt != null)) throw new NotFoundException("Host response not found.");
        if (action === "draft" && existing?.status === "published") throw new ConflictException("A published response cannot become a draft.");
        let status = "draft";
        if (action === "edit") {
          status = existing.status;
        } else if (action === "publish") {
          status = "published";
        }
        const saved = await repository.save({ ...existing, id: existing?.id || randomUUID(), reviewId,
          authorId: user.userId, authorRole: "host", message, status, createdAt: existing?.createdAt ?? now,
          updatedAt: now, publishedAt: status === "published" ? existing?.publishedAt ?? now : null, deletedAt: null });
        return { id: saved.id, message: saved.message, status: saved.status, createdAt: saved.createdAt,
          updatedAt: saved.updatedAt, publishedAt: saved.publishedAt };
      });
    } catch (error) {
      const cause = error.driverError || error;
      if (cause.code === "23505" && String(cause.constraint || cause.message).includes("review_response_review_unique")) {
        throw new ConflictException("A response already exists. Reload the review before editing.");
      }
      throw error;
    }
  }

  async deleteHostResponse(user, reviewId, deletedAt) {
    return runTransaction(async (manager) => {
      const review = await this.hostResponseQuery(manager, user.username)
        .andWhere("review.id = :reviewId", { reviewId }).getOne();
      if (!review) throw new NotFoundException("An eligible review you can respond to was not found.");
      const result = await manager.getRepository(Review_Response).update(
        { reviewId, deletedAt: IsNull() },
        { status: "deleted", deletedAt, updatedAt: deletedAt }
      );
      return result.affected === 1;
    });
  }

  async getPropertyReviewPerformance(propertyId, hostId, start, endExclusive, interval = "month") {
    const expressions = {
      week: "DATE_TRUNC('week', TO_TIMESTAMP(review.created_at / 1000.0) AT TIME ZONE 'UTC')",
      month: "DATE_TRUNC('month', TO_TIMESTAMP(review.created_at / 1000.0) AT TIME ZONE 'UTC')",
      year: "DATE_TRUNC('year', TO_TIMESTAMP(review.created_at / 1000.0) AT TIME ZONE 'UTC')",
    };
    if (!["week", "month", "year"].includes(interval)) throw new TypeError("Unsupported review interval.");
    const period = expressions[interval];
    const database = await Database.getInstance();
    return eligibleReviewQuery(database, propertyId)
      .innerJoin(Property, "property",
        "property.id = review.property_id AND property.hostid = :hostId", { hostId })
      .andWhere("review.created_at >= :start", { start })
      .andWhere("review.created_at < :endExclusive", { endExclusive })
      .select(`TO_CHAR(${period}, 'YYYY-MM-DD')`, "period")
      .addSelect("AVG(review.overall_rating)", "average_score")
      .addSelect("COUNT(*)", "review_count")
      .addSelect("COUNT(CASE WHEN ROUND(review.overall_rating) = 1 THEN 1 END)", "stars_1")
      .addSelect("COUNT(CASE WHEN ROUND(review.overall_rating) = 2 THEN 1 END)", "stars_2")
      .addSelect("COUNT(CASE WHEN ROUND(review.overall_rating) = 3 THEN 1 END)", "stars_3")
      .addSelect("COUNT(CASE WHEN ROUND(review.overall_rating) = 4 THEN 1 END)", "stars_4")
      .addSelect("COUNT(CASE WHEN ROUND(review.overall_rating) = 5 THEN 1 END)", "stars_5")
      .groupBy(period).orderBy(period, "ASC").getRawMany();
  }

  async getPropertyCategoryRatings(propertyId, hostId) {
    const database = await Database.getInstance();
    const rows = await database.getRepository(Review_Category).createQueryBuilder("category")
      .innerJoin(Property, "property", "property.id = :propertyId AND property.hostid = :hostId")
      .leftJoin((query) => query
        .select("definition.key", "category_key")
        .addSelect("AVG(rating.rating)", "average_rating")
        .addSelect("COUNT(*)", "rating_count")
        .from(Review_Rating, "rating")
        .innerJoin(Review_Category, "definition",
          `(LOWER(TRIM(rating.category)) = LOWER(TRIM(definition.key))
            OR LOWER(TRIM(rating.category)) = LOWER(TRIM(definition.label)))
            AND definition.isActive = :active AND definition.reviewType = :reviewType`)
        .innerJoin(Review, "review", "review.id = rating.reviewId")
        .where("review.property_id = :propertyId")
        .andWhere("review.publication_status = :published")
        .andWhere("review.status = :published")
        .andWhere("review.review_type = :reviewType")
        .andWhere("rating.rating BETWEEN :minimum AND :maximum")
        .andWhere("rating.rating * 2 = FLOOR(rating.rating * 2)")
        .groupBy("definition.key"),
      "aggregate", "aggregate.category_key = category.key")
      .select("category.key", "category_key")
      .addSelect("category.label", "label")
      .addSelect("aggregate.average_rating", "average_rating")
      .addSelect("category.sortOrder", "sort_order")
      .addSelect("COALESCE(aggregate.rating_count, 0)", "rating_count")
      .where("category.isActive = :active")
      .andWhere("category.reviewType = :reviewType")
      .setParameters({ propertyId, hostId, published: "PUBLISHED", reviewType: "GUEST_TO_PROPERTY",
        minimum: 1, maximum: 5, active: true })
      .orderBy("category.sortOrder", "ASC").addOrderBy("category.key", "ASC").getRawMany();
    return rows.map((row) => ({ category_key: row.category_key, label: row.label,
      average_rating: Number(row.rating_count) === 0 ? null : Number(row.average_rating),
      rating_count: Number(row.rating_count), sort_order: Number(row.sort_order ?? 0) }));
  }

  async findManagedProperty(propertyId, hostId) {
    const dataSource = await Database.getInstance();
    return dataSource.getRepository(Property).findOne({
      where: { id: propertyId, hostid: hostId }, select: ["id"],
    });
  }

  async getPropertyRatingHistory(hostId, propertyIds, { endExclusive, days }) {
    if (!propertyIds.length) return [];
    const database = await Database.getInstance();
    const periodMs = days * 86400000;
    const start = endExclusive - 6 * periodMs;
    const boundaries = Object.fromEntries([1, 2, 3, 4, 5].map((index) => [`historyBoundary${index}`, start + index * periodMs]));
    const bucket = `CASE ${[1, 2, 3, 4, 5].map((index) =>
      `WHEN review.created_at < :historyBoundary${index} THEN ${index - 1}`).join(" ")} ELSE 5 END`;
    const rows = await eligibleReviewQuery(database, propertyIds)
      .innerJoin(Property, "property", "property.id = review.property_id AND property.hostid = :hostId", { hostId })
      .andWhere("review.created_at >= :historyStart AND review.created_at < :historyEnd", { historyStart: start, historyEnd: endExclusive })
      .select("review.property_id", "property_id")
      .addSelect(bucket, "period_index")
      .addSelect("AVG(review.overall_rating)", "average_rating")
      .addSelect("COUNT(*)", "review_count")
      .setParameters(boundaries)
      .groupBy("review.property_id").addGroupBy(bucket).getRawMany();
    return rows.map((row) => ({ ...row, period_index: Number(row.period_index),
      average_rating: Number(row.average_rating), review_count: Number(row.review_count) }));
  }

  async getPropertyRatingTrendPage(hostId, options) {
    const database = await Database.getInstance();
    const aggregates = database.getRepository(Property).createQueryBuilder("property")
      .leftJoin(Review, "review", `review.property_id = property.id
        AND review.publication_status = :publicationStatus AND review.status = :publishedStatus
        AND review.review_type = :reviewType AND review.overall_rating BETWEEN 1 AND 5
        AND review.overall_rating * 2 = FLOOR(review.overall_rating * 2)
        AND review.created_at >= :previousStart AND review.created_at < :endExclusive`)
      .where("property.hostid = :hostId")
      .select("property.id", "property_id")
      .addSelect("AVG(CASE WHEN review.created_at < :currentStart THEN review.overall_rating END)", "previous_average_rating")
      .addSelect("AVG(CASE WHEN review.created_at >= :currentStart THEN review.overall_rating END)", "current_average_rating")
      .addSelect("COUNT(CASE WHEN review.created_at < :currentStart THEN 1 END)", "previous_review_count")
      .addSelect("COUNT(CASE WHEN review.created_at >= :currentStart THEN 1 END)", "current_review_count")
      .groupBy("property.id");
    const classified = database.createQueryBuilder().from(`(${aggregates.getQuery()})`, "scores")
      .select("scores.*")
      .addSelect(`CASE WHEN previous_review_count < :minimumReviews OR current_review_count < :minimumReviews
          OR previous_average_rating IS NULL OR current_average_rating IS NULL THEN 'INSUFFICIENT_DATA'
        WHEN current_average_rating - previous_average_rating <= :declineBoundary THEN 'DECLINING'
        WHEN current_average_rating - previous_average_rating >= :boundary THEN 'IMPROVING'
        ELSE 'STABLE' END`, "trend_status");
    const page = database.createQueryBuilder().from(`(${classified.getQuery()})`, "trends")
      .select("trends.*")
      .addSelect("CASE WHEN trends.trend_status = 'INSUFFICIENT_DATA' THEN NULL ELSE current_average_rating - previous_average_rating END", "rating_change")
      .setParameters({ hostId, previousStart: options.previousStart, currentStart: options.currentStart,
        endExclusive: options.endExclusive, minimumReviews: options.minimumReviews,
        boundary: options.threshold * (1 - 1e-12),
        declineBoundary: -options.threshold * (1 - 1e-12),
        publicationStatus: "PUBLISHED", publishedStatus: "PUBLISHED", reviewType: "GUEST_TO_PROPERTY" });
    if (options.status !== undefined) page.where("trends.trend_status = :trendStatus", { trendStatus: options.status });
    if (options.sort === "declining-first") {
      page.orderBy("CASE WHEN trends.trend_status = 'DECLINING' THEN 0 ELSE 1 END", "ASC");
    }
    const rows = await page.addOrderBy("trends.property_id", "ASC").offset(options.offset).limit(26).getRawMany();
    return rows.map((row) => ({ ...row,
      rating_change: row.rating_change == null ? null : Number(row.rating_change),
      previous_average_rating: row.previous_average_rating == null ? null : Number(row.previous_average_rating),
      current_average_rating: row.current_average_rating == null ? null : Number(row.current_average_rating),
      previous_review_count: Number(row.previous_review_count), current_review_count: Number(row.current_review_count) }));
  }

  async getPropertyReviewScore(propertyId, hostId) {
    const dataSource = await Database.getInstance();
    const query = dataSource.getRepository(Review).createQueryBuilder("review")
      .where("review.property_id = :propertyId", { propertyId })
      .andWhere("review.publication_status = :publicationStatus", { publicationStatus: "PUBLISHED" })
      .andWhere("review.status = :status", { status: "PUBLISHED" })
      .andWhere("review.review_type = :reviewType", { reviewType: "GUEST_TO_PROPERTY" })
      .andWhere("review.overall_rating BETWEEN :minimum AND :maximum", { minimum: 1, maximum: 5 })
      .andWhere("review.overall_rating * 2 = FLOOR(review.overall_rating * 2)")
      .innerJoin(Property, "property",
        "property.id = review.property_id AND property.hostid = :hostId", { hostId })
      .select("AVG(review.overall_rating)", "overall_score")
      .addSelect("COUNT(*)", "review_count");
    const result = await query.getRawOne();
    const reviewCount = Number(result.review_count);
    return { property_id: propertyId,
      overall_score: reviewCount === 0 || result.overall_score == null ? null : Math.round(Number(result.overall_score) * 10) / 10, review_count: reviewCount };
  }

  async createResponse(record) {
    return this.mutateResponse(
      record.reviewId,
      record.authorId,
      record.updatedAt,
      async (responses) => {
        const existing = await responses.findOne({
          where: {
            reviewId: record.reviewId,
            deletedAt: IsNull(),
          },
        });

        if (existing) {
          throw new ConflictException(
            "This review already has a response."
          );
        }

        return responses.save(record);
      }
    );
  }

  async updateResponse({
    reviewId,
    authorId,
    message,
    updatedAt,
  }) {
    return this.mutateResponse(
      reviewId,
      authorId,
      updatedAt,
      async (responses) => {
        const current = await responses.findOne({
          where: {
            reviewId,
            authorId,
            deletedAt: IsNull(),
          },
        });

        if (!current) return null;

        return this.saveResponseUpdate(
          responses,
          current,
          message,
          updatedAt
        );
      }
    );
  }

  async saveResponseUpdate(
    responses,
    current,
    message,
    updatedAt
  ) {
    const changes = {
      message,
      updatedAt: nextTimestamp(updatedAt, current.updatedAt),
    };

    const result = await responses.update(
      {
        id: current.id,
        authorId: current.authorId,
        deletedAt: IsNull(),
        updatedAt: current.updatedAt,
      },
      changes
    );

    return result.affected === 1
      ? { ...current, ...changes }
      : null;
  }

  async softDeleteResponse({ reviewId, authorId, deletedAt }) {
    return this.mutateResponse(
      reviewId,
      authorId,
      deletedAt,
      async (responses) => {
        const result = await responses.update(
          {
            reviewId,
            authorId,
            deletedAt: IsNull(),
          },
          {
            status: "deleted",
            deletedAt,
            updatedAt: deletedAt,
          }
        );

        return result.affected === 1;
      }
    );
  }

  async mutateResponse(reviewId, authorId, timestamp, callback) {
    return runTransaction(async (manager) => {
      await this.touchResponseParent(
        manager,
        reviewId,
        authorId,
        timestamp
      );

      return callback(manager.getRepository(Review_Response));
    });
  }

  async touchResponseParent(
    manager,
    reviewId,
    authorId,
    timestamp
  ) {
    const reviews = manager.getRepository(Review);
    const review = await reviews.findOne({
      where: { id: reviewId },
    });

    assertHostResponseAccess(review, authorId);

    // A shared parent write serializes concurrent response mutations.
    const result = await reviews.update(
      {
        id: reviewId,
        host_id: authorId,
        status: "PUBLISHED",
        publication_status: "PUBLISHED",
        updated_at: review.updated_at,
      },
      {
        updated_at: nextTimestamp(timestamp, review.updated_at),
      }
    );

    if (result.affected !== 1) {
      throw new ConflictException(
        "Review changed. Retry your response."
      );
    }
  }
}
