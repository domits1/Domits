import { randomUUID } from "node:crypto";
import { ReviewRepository } from "../../data/reviewRepository.js";
import { BadRequestException } from "../../util/exception/badRequestException.js";
import { ConflictException } from "../../util/exception/conflictException.js";
import { ForbiddenException } from "../../util/exception/forbiddenException.js";
import { NotFoundException } from "../../util/exception/notFoundException.js";
import { UnauthorizedException } from "../../util/exception/unauthorizedException.js";

const REVIEWABLE_STATUSES = new Set(["paid", "confirmed"]);


const REVIEW_MIN_LENGTH = 1;
const REVIEW_MAX_LENGTH = 500;
// eslint-disable-next-line no-control-regex -- Deliberately reject controls while allowing tabs and line breaks.
const INVALID_TEXT_CONTROLS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

const GUEST_REVIEW_TYPE = "GUEST_TO_PROPERTY";
const isDuplicateBookingReviewError = (error) => {
  const databaseError = error?.driverError || error;
  return databaseError?.code === "23505" &&
    /\breview_booking_type_reviewer_unique(?:_test)?\b/.test(
      `${databaseError.constraint || ""} ${databaseError.message || ""}`
    );
};

export class ReviewService {
  async getPublicReviews(propertyId, offset = "0") {
    if (typeof propertyId !== "string" || !propertyId.trim()) {
      throw new BadRequestException("A property ID is required.");
    }
    if (typeof offset !== "string" || !/^(0|[1-9]\d*)$/.test(offset)
      || !Number.isSafeInteger(Number(offset)) || Number(offset) > 100000) {
      throw new BadRequestException("Invalid review page offset.");
    }
    const result = await this.repository.getPublicReviewPage(propertyId.trim(), Number(offset));
    if (!result) throw new NotFoundException("Property not found.");
    return result;
  }

  // Missing or invalid policy configuration disables editing.
  constructor({ repository = new ReviewRepository(), now = () => Date.now(),
    editWindowMs = Number(process.env.REVIEW_EDIT_WINDOW_MS) } = {}) {
    this.repository = repository;
    this.now = now;
    this.editWindowMs = Number.isSafeInteger(editWindowMs) && editWindowMs > 0 ? editWindowMs : 0;
  }

  editDeadline(review) {
    const createdAt = Number(review.created_at);
    const deadline = createdAt + this.editWindowMs;
    return this.editWindowMs && Number.isSafeInteger(createdAt) && createdAt > 0
      && Number.isSafeInteger(deadline) ? deadline : 0;
  }

  // Verify the manager owns or can access the property before exposing aggregate review data.
  // This prevents unauthorized users from learning whether a property exists or has ratings.
  async authorizeManagedProperty(callerUsername, propertyId) {
    if (typeof callerUsername !== "string" || !callerUsername.trim()) {
      throw new UnauthorizedException("A verified user identity is required.");
    }
    if (typeof propertyId !== "string" || !propertyId.trim()) {
      throw new BadRequestException("A property ID is required.");
    }
    const normalizedPropertyId = propertyId.trim();
    const property = await this.repository.findManagedProperty(normalizedPropertyId, callerUsername);
    // Avoid disclosing whether another manager's property exists.
    if (!property) throw new NotFoundException("Property not found or access is denied.");
    return normalizedPropertyId;
  }

  // Compare current eligible scores across adjacent UTC windows for owned properties.
  async getPropertyRatingTrends(username, query = {}) {
    if (typeof username !== "string" || !username.trim()) {
      throw new UnauthorizedException("A verified user identity is required.");
    }
    // Policy is server-owned; absent or invalid settings disable trend detection.
    const threshold = Number(process.env.REVIEW_DECLINE_THRESHOLD);
    const minimumReviews = Number(process.env.REVIEW_TREND_MIN_REVIEWS);
    if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 4
      || !Number.isSafeInteger(minimumReviews) || minimumReviews < 1) {
      throw new Error("Review trend policy is not configured.");
    }
    const integerParameter = (value, name, maximum) => {
      if (typeof value !== "string" || !/^(0|[1-9]\d*)$/.test(value)
        || !Number.isSafeInteger(Number(value)) || Number(value) > maximum) {
        throw new BadRequestException(`Invalid ${name}.`);
      }
      return Number(value);
    };
    const days = integerParameter(query.days, "days", 366);
    if (days < 1) throw new BadRequestException("days must be positive.");
    const offset = integerParameter(query.offset ?? "0", "offset", 100000);
    if (typeof query.endDate !== "string" || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(query.endDate)) {
      throw new BadRequestException("endDate must be YYYY-MM-DD.");
    }
    const endDate = Date.parse(`${query.endDate}T00:00:00.000Z`);
    if (!Number.isFinite(endDate) || new Date(endDate).toISOString().slice(0, 10) !== query.endDate) {
      throw new BadRequestException("endDate must be a valid date.");
    }
    const dayMs = 86_400_000;
    const endExclusive = endDate + dayMs;
    const currentStart = endExclusive - days * dayMs;
    const previousStart = currentStart - days * dayMs;
    const today = new Date(this.now());
    today.setUTCHours(0, 0, 0, 0);
    if (endExclusive > today.getTime()) {
      throw new BadRequestException("endDate must be before today in UTC.");
    }
    const properties = await this.repository.findManagedProperties(username, offset);
    const trends = [];
    // Reuse the score aggregation for both equal, adjacent windows, with bounded concurrency.
    for (const property of properties.slice(0, 25)) {
      const previous = await this.repository.getPropertyReviewScore(property.id, username,
        { start: previousStart, endExclusive: currentStart });
      const current = await this.repository.getPropertyReviewScore(property.id, username,
        { start: currentStart, endExclusive });
      // Do not return data if the property changed owners during these reads.
      if (!await this.repository.findManagedProperty(property.id, username)) continue;
      const sufficient = previous.review_count >= minimumReviews && current.review_count >= minimumReviews
        && Number.isFinite(previous.overall_score) && Number.isFinite(current.overall_score);
      const change = sufficient ? current.overall_score - previous.overall_score : null;
      let status = "INSUFFICIENT_DATA";
      if (sufficient) {
        // Avoid floating-point noise at the configured threshold boundary.
        status = change <= -threshold * (1 - 1e-12) ? "DECLINING"
          : change >= threshold * (1 - 1e-12) ? "IMPROVING" : "STABLE";
      }
      trends.push({ property_id: property.id, current_average_rating: current.overall_score,
        previous_average_rating: previous.overall_score, rating_change: change,
        current_review_count: current.review_count, previous_review_count: previous.review_count,
        trend_status: status });
    }
    const dateLabel = (timestamp) => new Date(timestamp).toISOString().slice(0, 10);
    return { timezone: "UTC", days, decline_threshold: threshold, minimum_reviews_per_period: minimumReviews,
      previous_period: { start_date: dateLabel(previousStart), end_date: dateLabel(currentStart - dayMs) },
      current_period: { start_date: dateLabel(currentStart), end_date: query.endDate },
      properties: trends, next_offset: properties.length > 25 ? offset + 25 : null };
  }

  // Return the trusted review score for a manager-owned property.
  async getPropertyOverallScore(username, propertyId) {
    const id = await this.authorizeManagedProperty(username, propertyId);
    return this.repository.getPropertyReviewScore(id, username);
  }

  // Group current eligible scores by review creation period, rather than reconstructing past edits.
  // UTC buckets and explicit empty periods make the response ready for a line chart.
  async getPropertyReviewPerformance(username, propertyId, query = {}) {
    const id = await this.authorizeManagedProperty(username, propertyId);
    const interval = query.interval === undefined ? "month" : query.interval;
    if (!["week", "month", "year"].includes(interval)) {
      throw new BadRequestException("interval must be week, month, or year.");
    }
    const parseDate = (value, name) => {
      if (typeof value !== "string" || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) {
        throw new BadRequestException(`${name} must be YYYY-MM-DD.`);
      }
      const timestamp = Date.parse(`${value}T00:00:00.000Z`);
      if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) {
        throw new BadRequestException(`${name} must be a valid date.`);
      }
      return timestamp;
    };
    const start = parseDate(query.startDate, "startDate");
    const end = parseDate(query.endDate, "endDate");
    if (start > end) throw new BadRequestException("startDate must not exceed endDate.");
    const cursor = new Date(start);
    if (interval === "week") {
      cursor.setUTCDate(cursor.getUTCDate() - (cursor.getUTCDay() + 6) % 7);
    } else {
      cursor.setUTCDate(1);
      if (interval === "year") cursor.setUTCMonth(0);
    }
    const periodDates = [];
    while (cursor.getTime() <= end) {
      if (periodDates.length === 120) {
        throw new BadRequestException("Select a range covering at most 120 periods.");
      }
      periodDates.push(cursor.toISOString().slice(0, 10));
      if (interval === "week") cursor.setUTCDate(cursor.getUTCDate() + 7);
      else if (interval === "month") cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      else cursor.setUTCFullYear(cursor.getUTCFullYear() + 1);
    }
    // The exclusive bound includes the entire requested end date in UTC.
    const rows = await this.repository.getPropertyReviewPerformance(id, username, start, end + 86_400_000, interval);
    const byPeriod = new Map(rows.map((row) => [row.period, row]));
    const periods = [];
    for (const period of periodDates) {
      const row = byPeriod.get(period);
      periods.push({ period, average_score: row ? Number(row.average_score) : null,
        review_count: row ? Number(row.review_count) : 0 });
    }
    return { property_id: id, interval, timezone: "UTC", start_date: query.startDate,
      end_date: query.endDate, periods };
  }

  // Return category-level review metrics for a property the caller manages.
  async getPropertyCategoryRatings(username, propertyId) {
    const id = await this.authorizeManagedProperty(username, propertyId);
    const categories = await this.repository.getPropertyCategoryRatings(id, username);
    return { property_id: id, categories };
  }

  // Load a review only when it belongs to the caller and the edit window is still open.
  // This prevents users from editing someone else's review or changing a review after the deadline.
  async getEditableReview(callerUserId, reviewId) {
    if (typeof reviewId !== "string" || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(reviewId)) {
      throw new BadRequestException("A valid review ID is required.");
    }
    const review = await this.repository.findReviewById(reviewId);
    if (!review) throw new NotFoundException("Review not found.");
    if (String(review.reviewer_user_id) !== String(callerUserId)) {
      throw new ForbiddenException("You can only edit your own reviews.");
    }
    const timestamp = this.now();
    if (timestamp < Number(review.created_at) || timestamp >= this.editDeadline(review)) {
      throw new ForbiddenException("The review editing period has ended or editing is unavailable.");
    }
    return { id: review.id, overall_rating: review.overall_rating,
      public_review: review.public_review, updated_at: Number(review.updated_at) };
  }

  // Apply a safe, authorized review edit and reject stale client versions.
  // This protects the integrity of the review by preventing unauthorized or out-of-date changes.
  async updateReview(callerUserId, reviewId, data) {
    const review = await this.getEditableReview(callerUserId, reviewId);
    const allowed = ["overall_rating", "public_review", "updated_at"];
    if (!data || typeof data !== "object" || Array.isArray(data)
      || Object.keys(data).some((key) => !allowed.includes(key))) {
      throw new BadRequestException("Only the rating, written review, and update version may be submitted.");
    }
    const publicReview = this.validateReviewPayload({
      booking_id: reviewId, title: "Existing review", overall_rating: data.overall_rating, public_review: data.public_review,
    });
    if (!Number.isSafeInteger(data.updated_at) || data.updated_at < 0 || data.updated_at >= Number.MAX_SAFE_INTEGER) {
      throw new BadRequestException("A valid review update version is required.");
    }
    if (data.updated_at !== review.updated_at) {
      throw new ConflictException("This review has changed. Reload it before editing.");
    }
    const result = await this.repository.updateEditableReview({
      id: reviewId, guestId: callerUserId, previousUpdatedAt: data.updated_at,
      editWindowMs: this.editWindowMs, now: this.now,
      overallRating: data.overall_rating, publicReview,
    });
    if (!result.affected) {
      throw new ConflictException("The review changed or its editing period ended. Reload the review.");
    }
    return { id: reviewId, overall_rating: data.overall_rating,
      public_review: publicReview, updated_at: result.updated_at };
  }

  // Create a verified review only from a completed, caller-owned reservation.
  // This prevents spoofed or invalid submissions from creating fake review records.
  async createReview(callerUserId, reviewData) {
    const publicReview = this.validateReviewPayload(reviewData);

    const bookingId = reviewData.booking_id.trim();
    const booking = await this.repository.findBookingById(bookingId);

    if (!booking) {
      throw new NotFoundException("Reservation not found.");
    }

    if (String(booking.guestid) !== String(callerUserId)) {
      throw new ForbiddenException("You can only review your own reservation.");
    }

    const status = String(booking.status || "").trim().toLowerCase();
    const checkoutAt = Number(booking.departuredate);
    const now = this.now();

    if (!REVIEWABLE_STATUSES.has(status)) {
      throw new BadRequestException("Only paid or confirmed reservations can be reviewed.");
    }

    if (!Number.isFinite(checkoutAt) || checkoutAt <= 0 || checkoutAt > now) {
      throw new BadRequestException("You can only review a reservation after checkout.");
    }

    const duplicateKey = { booking_id: bookingId, review_type: GUEST_REVIEW_TYPE, reviewer_user_id: callerUserId };
    if (await this.repository.findReviewByBookingTypeAndReviewer(duplicateKey)) {
      throw new ConflictException("This reservation already has a review.");
    }
    const categoryRatings = reviewData.category_ratings || {};
    if (Object.keys(categoryRatings).length) {
      const supported = await this.repository.findActiveCategoryKeys(GUEST_REVIEW_TYPE);
      if (Object.keys(categoryRatings).some((key) => !supported.has(key))) {
        throw new BadRequestException("Unsupported rating category.");
      }
    }

    try {
      return await this.repository.create({
        id: randomUUID(),
        ...duplicateKey,
        property_id: booking.property_id,
        host_id: booking.hostid,
        reviewee_user_id: booking.hostid,
        overall_rating: reviewData.overall_rating,
        title: reviewData.title.trim(),
        public_review: publicReview,
        private_feedback: this.normalizeOptionalText(reviewData.private_feedback),
        verification_status: "UNVERIFIED",
        publication_status: "UNPUBLISHED",
        status: "DRAFT",
        created_at: now,
        updated_at: now,
      }, categoryRatings);
    } catch (error) {
      if (isDuplicateBookingReviewError(error)) {
        throw new ConflictException("This reservation already has a review.");
      }

      throw error;
    }
  }

  // Validate review inputs before any business logic or database write runs.
  // This keeps malformed payloads from reaching reservation checks or persistence.
  validateReviewPayload(reviewData) {
    if (!reviewData || typeof reviewData !== "object" || Array.isArray(reviewData)) {
      throw new BadRequestException("Request body must be a review object");
    }

    if (typeof reviewData.booking_id !== "string") {
      throw new BadRequestException("booking_id must be a string");
    }
    if (!reviewData.booking_id.trim() || reviewData.booking_id.trim().length > 255) {
      throw new BadRequestException("A booking_id of up to 255 characters is required");
    }

    if (!Number.isInteger(reviewData.overall_rating) || reviewData.overall_rating < 1 || reviewData.overall_rating > 5) {
      throw new BadRequestException("Please select an overall experience rating from 1 to 5 stars.");
    }

    if (typeof reviewData.title !== "string" || !reviewData.title.trim() || reviewData.title.trim().length > 120) {
      throw new BadRequestException("A review title of up to 120 characters is required");
    }
    const ratings = reviewData.category_ratings;
    if (ratings !== undefined && (!ratings || typeof ratings !== "object" || Array.isArray(ratings) ||
      Object.values(ratings).some((value) => !Number.isFinite(value) || value < 1 || value > 5))) {
      throw new BadRequestException("category_ratings must contain ratings from 1 to 5");
    }

    if (
      reviewData.private_feedback !== undefined &&
      reviewData.private_feedback !== null &&
      typeof reviewData.private_feedback !== "string"
    ) {
      throw new BadRequestException("private_feedback must be a string");
    }
    return this.normalizePublicReview(reviewData.public_review);
  }

  // Normalize and sanitize the written review text before saving it.
  // This ensures reviews are plain text, within limits, and free of unsafe control characters.
  normalizePublicReview(value) {
    if (value === undefined || value === null) {
      throw new BadRequestException("Please describe your stay before submitting your review.");
    }
    if (typeof value !== "string") throw new BadRequestException("Written review must be plain text.");
    if (INVALID_TEXT_CONTROLS.test(value)) {
      throw new BadRequestException("Please remove unsupported control characters from your review.");
    }
    const text = value.replace(/\r\n?/g, "\n").trim();
    if (text.length < REVIEW_MIN_LENGTH) {
      throw new BadRequestException("Please describe your stay before submitting your review.");
    }
    if (text.length > REVIEW_MAX_LENGTH) {
      throw new BadRequestException(`Your written review must be ${REVIEW_MAX_LENGTH} characters or fewer.`);
    }
    // Store plain text; React text children escape HTML when displaying it.
    return text;
  }

  // Normalize optional private feedback without letting blanks become stored garbage.
  // This keeps optional feedback consistent while avoiding empty values in the database.
  normalizeOptionalText(value) {
    if (!value) return null;

    const text = value.trim();
    return text || null;
  }

  // Return the caller's review list using the requested scope and editability rules.
  // This gives a clear view of written or received reviews while marking which entries can still be edited.
  async getReviews(callerUserId, scope = "written") {
    if (scope !== "written" && scope !== "received") {
      throw new BadRequestException("Review scope must be written or received.");
    }
    const reviews = await this.repository.findReviews(scope === "written"

      ? { reviewer_user_id: callerUserId }
      : [
        { host_id: callerUserId, status: "PUBLISHED", publication_status: "PUBLISHED" },
        { reviewee_user_id: callerUserId, status: "PUBLISHED", publication_status: "PUBLISHED" },
      ]);
    const timestamp = this.now();
    return reviews.map((review) => ({
      ...review, rating: review.overall_rating, content: review.public_review, date: review.created_at,
      can_edit: scope === "written" && timestamp >= Number(review.created_at)
        && timestamp < this.editDeadline(review),
      edit_expires_at: scope === "written" ? this.editDeadline(review) : 0,
    }));
  }

  // Delete a review only when the caller owns it.
  // This prevents users from removing someone else's review or deleting an invalid record.
  async deleteReview(callerUserId, id) {
    if (typeof id !== "string" || !id.trim() || id.length > 255) {
      throw new BadRequestException("A valid review ID is required.");
    }
    const result = await this.repository.deleteOwnReview(id, callerUserId, this.now());
    if (!result.affected) {
      throw new NotFoundException("Review not found.");
    }
  }

  async getPublicPropertyReviews(propertyId, query = {}) {
    if (typeof propertyId !== "string" || !propertyId.trim() || propertyId.length > 255) {
      throw new BadRequestException("A valid property ID is required.");
    }
    if (query.sort && !["recent", "highest", "lowest"].includes(query.sort)) {
      throw new BadRequestException("Unsupported review sort.");
    }
    if (query.verifiedOnly !== undefined && !["true", "false"].includes(query.verifiedOnly)) {
      throw new BadRequestException("verifiedOnly must be true or false.");
    }
    return this.repository.findPublicPropertyReviews(propertyId, {
      sort: query.sort || "recent", verifiedOnly: query.verifiedOnly === "true", category: query.category || null,
    });
  }
}
