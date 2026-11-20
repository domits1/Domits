import { In, IsNull, Not } from "typeorm";
import Database from "database";
import { Property } from "database/models/Property";
import { Review } from "database/models/Review";
import { Review_Rating } from "database/models/Review_Rating";
import { Review_Category } from "database/models/Review_Category";
import { Review_Response } from "database/models/Review_Response";
import { attachPublicDetails, eligibleReviewQuery, REVIEW_FIELDS } from "./reviewRepositoryShared.js";

const average = (values) => {
  const numbers = values.map(Number).filter(Number.isFinite);
  return numbers.length ? Math.round(numbers.reduce((sum, n) => sum + n, 0) / numbers.length * 10) / 10 : null;
};

const toPublicReview = (review) => ({
  id: review.id,
  overallRating: Number(review.overall_rating),
  title: review.title,
  publicReview: review.public_review,
  verificationStatus: review.verification_status,
  status: review.status,
  createdAt: review.created_at,
  categoryRatings: review.categoryRatings || {},
  response:
    review.response?.status === "published" &&
    review.response.deletedAt == null
      ? {
          id: review.response.id,
          authorRole: review.response.authorRole,
          message: review.response.message,
          publishedAt: review.response.publishedAt,
        }
      : null,
});

export class PublicReviewRepository {
  async getPublicReviewPage(propertyId, offset, filters = {}) {
    const database = await Database.getInstance();
    const property = await database.getRepository(Property).findOne({
      where: { id: propertyId, status: "ACTIVE" }, select: ["id"],
    });
    if (!property) return null;
    const eligible = () => eligibleReviewQuery(database, propertyId)
      .innerJoin(Property, "property", "property.id = review.property_id AND property.status = :propertyStatus",
        { propertyStatus: "ACTIVE" });
    const matchingReviews = () => {
      const query = eligible().andWhere("review.overall_rating BETWEEN :filterMinimum AND :filterMaximum", {
        filterMinimum: filters.minRating ?? 1, filterMaximum: filters.maxRating ?? 5,
      });
      if (filters.start !== undefined) query.andWhere("review.created_at >= :filterStart", { filterStart: filters.start });
      if (filters.endExclusive !== undefined) query.andWhere("review.created_at < :filterEnd", { filterEnd: filters.endExclusive });
      return query;
    };
    const summary = await eligible().select("AVG(review.overall_rating)", "score").getRawOne();
    const matching = await matchingReviews().select("COUNT(*)", "count").getRawOne();
    const page = matchingReviews()
      .select(["review.id", "review.overall_rating", "review.public_review", "review.created_at", "review.verification_status"]);
    const recent = !filters.sort || filters.sort === "recent";
    if (filters.sort === "highest" || filters.sort === "lowest") {
      page.orderBy("review.overall_rating", filters.sort === "highest" ? "DESC" : "ASC")
        .addOrderBy("review.created_at", "DESC");
    } else {
      page.orderBy("review.created_at", "DESC");
      if (filters.cursor) page.andWhere(
        "(review.created_at < :cursorDate OR (review.created_at = :cursorDate AND review.id < :cursorId))",
        { cursorDate: filters.cursor.date, cursorId: filters.cursor.id });
    }
    // Fetch one extra row to detect another page without applying the cursor to the matching count.
    const rows = await page.addOrderBy("review.id", "DESC").offset(offset).limit(recent ? 11 : 10).getMany();
    const reviews = rows.slice(0, 10), last = reviews[reviews.length - 1];
    const nextCursor = recent && rows.length > 10 ? Buffer.from(JSON.stringify({
      propertyId, date: Number(last.created_at), id: last.id,
    })).toString("base64url") : null;
    const ids = reviews.map((review) => review.id);
    const ratings = ids.length ? await database.getRepository(Review_Rating).createQueryBuilder("rating")
      .innerJoin(Review_Category, "category", "category.key = rating.category AND category.isActive = :active AND category.reviewType = :reviewType",
        { active: true, reviewType: "GUEST_TO_PROPERTY" })
      .select("rating.reviewId", "review_id").addSelect("category.key", "key")
      .addSelect("category.label", "label").addSelect("rating.rating", "rating")
      .where("rating.reviewId IN (:...ids)", { ids })
      .andWhere("rating.rating BETWEEN 1 AND 5")
      .andWhere("rating.rating * 2 = FLOOR(rating.rating * 2)").getRawMany() : [];
    const count = Number(matching.count);
    const responses = ids.length ? await database.getRepository(Review_Response).find({
      where: { reviewId: In(ids), status: "published", deletedAt: IsNull() },
      select: ["reviewId", "message", "publishedAt"],
    }) : [];
    return { property_id: propertyId, overall_score: summary.score == null ? null : Number(summary.score),
      review_count: count, next_offset: !recent && offset + 10 < count ? offset + 10 : null,
      next_cursor: nextCursor,
      reviews: reviews.map((review) => ({ id: review.id, rating: review.overall_rating,
        text: review.public_review, date: Number(review.created_at), verified: review.verification_status === "VERIFIED_STAY",
        response: responses.filter((response) => response.reviewId === review.id)
          .map(({ message, publishedAt }) => ({ message, publishedAt }))[0] || null,
        categories: ratings.filter((rating) => rating.review_id === review.id)
          .map(({ key, label, rating }) => ({ key, label, rating: Number(rating) })) })) };
  }

  async findReviews(where) {
    const dataSource = await Database.getInstance();

    const visibleWhere = (Array.isArray(where) ? where : [where]).map(
      (filter) => ({
        ...filter,
        status: filter.status ?? Not("REJECTED"),
      })
    );

    const reviews = await dataSource.getRepository(Review).find({
      where: Array.isArray(where) ? visibleWhere : visibleWhere[0],
      order: { created_at: "DESC", id: "DESC" },
      select: REVIEW_FIELDS,
    });

    return attachPublicDetails(dataSource, reviews);
  }

  async findPublicForProperty(propertyId, { limit, offset }) {
    const dataSource = await Database.getInstance();

    const reviews = await dataSource
      .getRepository(Review)
      .createQueryBuilder("review")
      .select([
        "review.id",
        "review.property_id",
        "review.overall_rating",
        "review.title",
        "review.public_review",
        "review.created_at",
      ])
      .where("review.property_id = :propertyId", { propertyId })
      .andWhere("review.review_type = :reviewType", {
        reviewType: "GUEST_TO_PROPERTY",
      })
      .andWhere("review.publication_status = :published", {
        published: "PUBLISHED",
      })
      .andWhere("review.status = :publishedStatus", {
        publishedStatus: "PUBLISHED",
      })
      .orderBy("review.created_at", "DESC")
      .addOrderBy("review.id", "DESC")
      .skip(offset)
      .take(limit)
      .getMany();

    return attachPublicDetails(dataSource, reviews);
  }

  async findPublicPropertyReviews(
    propertyId,
    {
      sort = "recent",
      verifiedOnly = false,
      category = null,
    } = {}
  ) {
    const reviews = await this.findReviews({
      property_id: propertyId,
      review_type: "GUEST_TO_PROPERTY",
      status: "PUBLISHED",
      publication_status: "PUBLISHED",
    });

    const filtered = this.filterPublicReviews(
      reviews,
      verifiedOnly,
      category
    );

    this.sortPublicReviews(filtered, sort);

    return this.buildPublicSummary(filtered);
  }

  filterPublicReviews(reviews, verifiedOnly, category) {
    return reviews.filter(
      (review) =>
        (!verifiedOnly ||
          review.verification_status === "VERIFIED_STAY") &&
        (!category ||
          review.categoryRatings?.[category] !== undefined)
    );
  }

  sortPublicReviews(reviews, sort) {
    reviews.sort((a, b) => {
      let ratingOrder = 0;

      if (sort === "highest") {
        ratingOrder =
          Number(b.overall_rating) - Number(a.overall_rating);
      } else if (sort === "lowest") {
        ratingOrder =
          Number(a.overall_rating) - Number(b.overall_rating);
      }

      return (
        ratingOrder ||
        Number(b.created_at) - Number(a.created_at) ||
        b.id.localeCompare(a.id)
      );
    });
  }

  buildPublicSummary(reviews) {
    return {
      reviews: reviews.map(toPublicReview),
      totalReviews: reviews.length,
      overallRating: average(
        reviews.map((review) => review.overall_rating)
      ),
      categoryRatings: this.calculateCategoryAverages(reviews),
    };
  }

  calculateCategoryAverages(reviews) {
    const categories = new Map();

    for (const review of reviews) {
      for (const [key, rating] of Object.entries(
        review.categoryRatings || {}
      )) {
        if (!categories.has(key)) categories.set(key, []);

        categories.get(key).push(rating);
      }
    }

    return Object.fromEntries(
      [...categories].map(([key, ratings]) => [
        key,
        average(ratings),
      ])
    );
  }
}
