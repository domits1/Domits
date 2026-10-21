import { readTrendPolicy, parseTrendQuery, classifyTrend, TREND_PAGE_SIZE } from "../ratingTrends.js";
import { randomUUID } from "node:crypto";
import { ReviewRepository } from "../../data/reviewRepository.js";
import { BadRequestException } from "../../util/exception/badRequestException.js";
import { ConflictException } from "../../util/exception/conflictException.js";
import { ForbiddenException } from "../../util/exception/forbiddenException.js";
import { NotFoundException } from "../../util/exception/notFoundException.js";
import { UnauthorizedException } from "../../util/exception/unauthorizedException.js";
import { assertEligibleBooking, assertHostResponseAccess, isPublished } from "../reviewRules.js";

import { completedStayError } from "../../util/verifiedStay.js";

const DAY_MS = 86_400_000;
const MAX_PERFORMANCE_PERIODS = 120;
const formatPerformanceDate = (timestamp) => new Date(timestamp).toISOString().slice(0, 10);

function parsePerformanceDate(value, name) {
  if (typeof value !== "string" || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException(`${name} must be YYYY-MM-DD.`);
  }
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp) || formatPerformanceDate(timestamp) !== value) {
    throw new BadRequestException(`${name} must be a valid date.`);
  }
  return timestamp;
}

function getPerformancePeriodStart(timestamp, interval) {
  const date = new Date(timestamp);
  if (interval === "week") {
    date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  } else {
    date.setUTCDate(1);
    if (interval === "year") date.setUTCMonth(0);
  }
  return date.getTime();
}

function getNextPerformancePeriod(timestamp, interval) {
  const date = new Date(timestamp);
  switch (interval) {
    case "week": date.setUTCDate(date.getUTCDate() + 7); break;
    case "month": date.setUTCMonth(date.getUTCMonth() + 1); break;
    case "year": date.setUTCFullYear(date.getUTCFullYear() + 1); break;
  }
  return date.getTime();
}

function generatePerformancePeriods(start, endExclusive, interval) {
  const periods = [];
  for (let periodStart = getPerformancePeriodStart(start, interval); periodStart < endExclusive;) {
    if (periods.length >= MAX_PERFORMANCE_PERIODS) {
      throw new BadRequestException("Select a range covering at most 120 periods.");
    }
    const nextPeriod = getNextPerformancePeriod(periodStart, interval);
    const coverageStart = Math.max(start, periodStart);
    const coverageEndExclusive = Math.min(endExclusive, nextPeriod);
    periods.push({
      period: formatPerformanceDate(periodStart),
      coverage_start: formatPerformanceDate(coverageStart),
      coverage_end: formatPerformanceDate(coverageEndExclusive - DAY_MS),
      is_partial: coverageStart !== periodStart || coverageEndExclusive !== nextPeriod,
    });
    periodStart = nextPeriod;
  }
  return periods;
}



const REVIEW_MIN_LENGTH = 1;
const REVIEW_MAX_LENGTH = 500;
// eslint-disable-next-line no-control-regex -- Deliberately reject controls while allowing tabs and line breaks.
const INVALID_TEXT_CONTROLS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

const GUEST_REVIEW_TYPE = "GUEST_TO_PROPERTY";
const EDITABLE_FIELDS = new Set(["overall_rating", "title", "public_review", "private_feedback", "category_ratings"]);
const toReviewView = (review) => ({
  id: review.id, booking_id: review.booking_id, property_id: review.property_id,
  reviewer_user_id: review.reviewer_user_id, reviewee_user_id: review.reviewee_user_id,
  review_type: review.review_type, overall_rating: Number(review.overall_rating),
  title: review.title, public_review: review.public_review,
  verification_status: review.verification_status, publication_status: review.publication_status,
  status: review.status, created_at: review.created_at, updated_at: review.updated_at,
});
const toResponseView = (response) => ({
  id: response.id, reviewId: response.reviewId, authorRole: response.authorRole,
  status: response.status, message: response.message, createdAt: response.createdAt,
  updatedAt: response.updatedAt, publishedAt: response.publishedAt,
});
const isDuplicateBookingReviewError = (error) => {
  const databaseError = error?.driverError || error;
  return (
    databaseError?.code === "23505" &&
    /\breview_booking_type_reviewer_unique(?:_test)?\b/.test(
      `${databaseError.constraint || ""} ${databaseError.message || ""}`
    )
  );
};

export class ReviewService {
  async saveHostResponse(user, reviewId, body, action) {
    if (typeof user?.username !== "string" || !user.username.trim() || typeof user.userId !== "string" || !user.userId.trim()) throw new UnauthorizedException("A verified host identity is required.");
    if (typeof reviewId !== "string" || !reviewId.trim() || reviewId.length > 255) throw new BadRequestException("A valid review ID is required.");
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => key !== "message")) {
      throw new BadRequestException("Only response text may be submitted.");
    }
    if (!["draft", "edit", "publish"].includes(action) || typeof body.message !== "string" || INVALID_TEXT_CONTROLS.test(body.message)) {
      throw new BadRequestException("Response must contain supported plain text.");
    }
    const message = body.message.replace(/\r\n?/g, "\n").trim();
    if (!message || message.length > 500) throw new BadRequestException("Write a response between 1 and 500 characters.");
    return this.repository.saveHostResponse(user, reviewId.trim(), message, action, this.now());
  }

  async getResponseEligibleReviews(username) {
    if (typeof username !== "string" || !username.trim()) throw new UnauthorizedException("A verified host identity is required.");
    const reviews = await this.repository.findResponseEligibleReviews(username);
    return reviews.map((review) => ({ ...review, content: review.public_review, date: review.created_at }));
  }

  async getPublicReviews(propertyId, offset = "0", filters = {}) {
    if (typeof propertyId !== "string" || !propertyId.trim()) {
      throw new BadRequestException("A property ID is required.");
    }
    if (typeof offset !== "string" || !/^(0|[1-9]\d*)$/.test(offset)
      || !Number.isSafeInteger(Number(offset)) || Number(offset) > 100000) {
      throw new BadRequestException("Invalid review page offset.");
    }
    const allowed = ["minRating", "maxRating", "startDate", "endDate", "sort", "cursor"];
    if (Object.keys(filters).some((key) => !allowed.includes(key))) {
      throw new BadRequestException("Unsupported review filter.");
    }
    const rating = (value, fallback) => {
      if (value === undefined) return fallback;
      if (typeof value !== "string" || !/^[1-5]$/.test(value)) {
        throw new BadRequestException("Ratings must be whole numbers from 1 to 5.");
      }
      return Number(value);
    };
    const date = (value) => {
      if (value === undefined) return undefined;
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new BadRequestException("Dates must use YYYY-MM-DD.");
      }
      const timestamp = Date.parse(`${value}T00:00:00.000Z`);
      if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) {
        throw new BadRequestException("Invalid review date.");
      }
      return timestamp;
    };
    const minRating = rating(filters.minRating, 1), maxRating = rating(filters.maxRating, 5);
    const start = date(filters.startDate), end = date(filters.endDate), sort = filters.sort ?? "recent";
    if (minRating > maxRating || (start !== undefined && end !== undefined && start > end)) {
      throw new BadRequestException("Invalid review filter range.");
    }
    if (!["recent", "highest", "lowest"].includes(sort)) throw new BadRequestException("Unsupported review sort.");
    let cursor;
    if (filters.cursor !== undefined) {
      try {
        if (typeof filters.cursor !== "string" || filters.cursor.length > 2048
          || !/^[A-Za-z0-9_-]+$/.test(filters.cursor) || sort !== "recent" || Number(offset) !== 0) throw new Error();
        cursor = JSON.parse(Buffer.from(filters.cursor, "base64url").toString("utf8"));
        if (!cursor || cursor.propertyId !== propertyId.trim() || !Number.isSafeInteger(cursor.date)
          || cursor.date < 0 || typeof cursor.id !== "string" || !cursor.id.trim() || cursor.id.length > 255) throw new Error();
      } catch {
        throw new BadRequestException("Invalid recent-review cursor.");
      }
    }
    const result = await this.repository.getPublicReviewPage(propertyId.trim(), Number(offset), {
      minRating, maxRating, start, endExclusive: end === undefined ? undefined : end + 86400000, sort, cursor,
      verificationNow: this.now(),
    });
    if (!result) throw new NotFoundException("Property not found.");
    return result;
  }


  constructor({ repository = new ReviewRepository(), now = () => Date.now(),
    canReadPrivateFeedback = async ({ userId, review }) =>
      review.reviewer_user_id === userId || review.host_id === userId,
    canPublishReview = async ({ userId, review }) => review.reviewer_user_id === userId,
    editWindowMs = Number(process.env.REVIEW_EDIT_WINDOW_MS) } = {}) {
    this.repository = repository;
    this.now = now;
    this.canReadPrivateFeedback = canReadPrivateFeedback;
    this.canPublishReview = canPublishReview;
    this.editWindowMs = Number.isSafeInteger(editWindowMs) && editWindowMs > 0 ? editWindowMs : 0;
  }

  editDeadline(review) {
    const createdAt = Number(review.created_at);
    const deadline = createdAt + this.editWindowMs;
    return this.editWindowMs && Number.isSafeInteger(createdAt) && createdAt > 0
      && Number.isSafeInteger(deadline) ? deadline : 0;
  }

  async authorizeManagedProperty(callerUsername, propertyId) {
    if (typeof callerUsername !== "string" || !callerUsername.trim()) {
      throw new UnauthorizedException("A verified user identity is required.");
    }
    if (typeof propertyId !== "string" || !propertyId.trim()) {
      throw new BadRequestException("A property ID is required.");
    }
    this.assertId(propertyId, "property ID");
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
    const policy = readTrendPolicy();
    const options = parseTrendQuery(query, this.now());
    const { days, offset, previousStart, currentStart } = options;
    const { threshold, minimumReviews } = policy;
    // Aggregate both windows and apply status/order before limiting the result.
    // Ownership and all scores are read in one database statement/snapshot.
    const rows = await this.repository.getPropertyRatingTrendPage(username, { ...options, ...policy });
    const trends = rows.slice(0, TREND_PAGE_SIZE).map((row) => ({
      property_id: row.property_id,
      current_average_rating: row.current_average_rating,
      previous_average_rating: row.previous_average_rating,
      current_review_count: row.current_review_count,
      previous_review_count: row.previous_review_count,
      ...classifyTrend(
        { overall_score: row.previous_average_rating, review_count: row.previous_review_count },
        { overall_score: row.current_average_rating, review_count: row.current_review_count }, policy),
    }));
    const dateLabel = (timestamp) => new Date(timestamp).toISOString().slice(0, 10);
    return { timezone: "UTC", days, decline_threshold: threshold, minimum_reviews_per_period: minimumReviews,
      previous_period: { start_date: dateLabel(previousStart), end_date: dateLabel(currentStart - DAY_MS) },
      current_period: { start_date: dateLabel(currentStart), end_date: query.endDate },
      properties: trends, next_offset: rows.length > TREND_PAGE_SIZE ? offset + TREND_PAGE_SIZE : null };
  }

  // Return the trusted review score for a manager-owned property.
  async getPropertyOverallScore(username, propertyId) {
    const id = await this.authorizeManagedProperty(username, propertyId);
    return this.repository.getPropertyReviewScore(id, username);
  }

  // Group current eligible scores by review creation period, rather than reconstructing past edits.
  // Exact inclusive UTC dates clip calendar buckets; coverage dates expose partial periods.
  // Week labels identify Mondays. Empty periods retain coverage with null scores and zero counts.
  async getPropertyReviewPerformance(username, propertyId, query = {}) {
    const id = await this.authorizeManagedProperty(username, propertyId);
    const interval = query.interval === undefined ? "month" : query.interval;
    if (!["week", "month", "year"].includes(interval)) {
      throw new BadRequestException("interval must be week, month, or year.");
    }
    const start = parsePerformanceDate(query.startDate, "startDate");
    const end = parsePerformanceDate(query.endDate, "endDate");
    if (start > end) throw new BadRequestException("startDate must not exceed endDate.");
    const endExclusive = end + DAY_MS;
    const buckets = generatePerformancePeriods(start, endExclusive, interval);
    // The exclusive bound includes the entire requested end date in UTC.
    const rows = await this.repository.getPropertyReviewPerformance(id, username, start, endExclusive, interval);
    const byPeriod = new Map(rows.map((row) => [row.period, row]));
    const periods = buckets.map((bucket) => {
      const row = byPeriod.get(bucket.period);
      return { ...bucket, average_score: row ? Number(row.average_score) : null,
        review_count: row ? Number(row.review_count) : 0 };
    });
    return { property_id: id, interval, timezone: "UTC", start_date: query.startDate,
      end_date: query.endDate, periods };
  }

  // Return category-level review metrics for a property the caller manages.
  async getPropertyCategoryRatings(username, propertyId) {
    const id = await this.authorizeManagedProperty(username, propertyId);
    const categories = await this.repository.getPropertyCategoryRatings(id, username);
    return { property_id: id, categories };
  }

  async getEditableReview(callerUserId, reviewId) {
    this.assertCaller(callerUserId);
    if (typeof reviewId !== "string" || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(reviewId)) {
      throw new BadRequestException("A valid review ID is required.");
    }
    const review = await this.repository.findReviewById(reviewId);
    if (!review || ["DELETED", "REJECTED"].includes(review.status)) throw new NotFoundException("Review not found.");
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

  async updateEditableReview(callerUserId, reviewId, data) {
    const review = await this.getEditableReview(callerUserId, reviewId);
    const allowed = new Set(["overall_rating", "public_review", "updated_at"]);
    if (!data || typeof data !== "object" || Array.isArray(data)
      || Object.keys(data).some((key) => !allowed.has(key))) {
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

  async getPropertyReviewScore(userId, propertyId) {
    this.assertCaller(userId);
    this.assertId(propertyId, "property ID");
    const id = propertyId.trim();
    if (!(await this.repository.findManagedProperty(id, userId))) {
      throw new NotFoundException("Property not found.");
    }
    return this.repository.getPropertyReviewScore(id, userId);
  }

  // Fetch the caller's reviews by scope.
  // This keeps the profile and dashboard views consistent with the user's written and received history.
  async getReviews(callerUserId, scope = "written") {
    this.assertCaller(callerUserId);
    if (!["written", "received"].includes(scope)) {
      throw new BadRequestException("scope must be written or received.");
    }
    const reviews = await this.repository.findForUser(callerUserId, scope);
    return reviews.filter((review) => scope === "written"
      ? String(review.reviewer_user_id) === callerUserId && !["DELETED", "REJECTED"].includes(review.status)
      : String(review.reviewee_user_id) === callerUserId && isPublished(review)).map((review) => ({
        ...toReviewView(review), rating: Number(review.overall_rating), content: review.public_review, date: review.created_at,
        can_edit: scope === "written" && this.now() >= Number(review.created_at) && this.now() < this.editDeadline(review),
        edit_expires_at: scope === "written" ? this.editDeadline(review) : 0,
      }));
  }

  // Remove a review only when it still belongs to the caller.
  // This prevents accidental deletion of someone else's record while preserving the soft-delete audit trail.
  async deleteReview(callerUserId, reviewId) {
    this.assertCaller(callerUserId);
    this.assertId(reviewId, "review ID");
    const review = await this.repository.findById(reviewId.trim());
    if (!review || ["DELETED", "REJECTED"].includes(review.status)) {
      throw new NotFoundException("Review not found.");
    }
    if (String(review.reviewer_user_id) !== String(callerUserId)) {
      throw new ForbiddenException("You can only delete your own review.");
    }
    const result = await this.repository.softDelete(review.id, callerUserId, this.now());
    if (result.affected !== 1) throw new NotFoundException("Review not found.");
  }

  // Return the published review feed for a property.
  // This powers the public listing page without exposing private feedback or unreleased drafts.
  async getPublicPropertyReviews(propertyId, query = {}) {
    this.assertId(propertyId, "property ID");
    for (const key of ["limit", "offset"]) {
      if (query[key] !== undefined && (typeof query[key] !== "string" || !/^\d+$/.test(query[key]))) {
        throw new BadRequestException("Pagination values must be integers.");
      }
    }
    const limit = Number(query.limit ?? 20);
    const offset = Number(query.offset ?? 0);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 ||
        !Number.isSafeInteger(offset) || offset < 0) {
      throw new BadRequestException("limit must be between 1 and 100; offset must be a non-negative integer.");
    }
    const reviews = await this.repository.findPublicForProperty(propertyId.trim(), { limit, offset });
    return reviews.map((review) => ({
      id: review.id, property_id: review.property_id, overall_rating: Number(review.overall_rating),
      title: review.title, public_review: review.public_review, created_at: review.created_at,
      categoryRatings: review.categoryRatings ?? {},
      response: review.response?.status === "published" && review.response.deletedAt == null
        ? toResponseView(review.response) : null,
    }));
  }

  // Fetch one review with the required visibility rules.
  // This lets the caller read their own review or a published review without revealing hidden content.
  async getReviewById(userId, reviewId) {
    this.assertCaller(userId);
    const review = await this.requireReview(reviewId);
    if (String(review.reviewer_user_id) !== userId && !isPublished(review)) {
      throw new NotFoundException("Review not found.");
    }
    return toReviewView(review);
  }

  // Update an unpublished draft review safely.
  // This lets the guest refine their draft while preventing edits after publication or conflicting changes.
  async updateReview(userId, reviewId, changes) {
    this.assertCaller(userId);
    this.assertObject(changes);
    const keys = Object.keys(changes);
    if (!keys.length || keys.some((key) => !EDITABLE_FIELDS.has(key))) {
      throw new BadRequestException("Provide only editable review fields.");
    }
    const review = await this.requireReview(reviewId);
    if (String(review.reviewer_user_id) !== userId) throw new ForbiddenException("You can only update your own review.");
    if (review.status !== "DRAFT" || review.publication_status !== "UNPUBLISHED") {
      throw new ConflictException("Only unpublished draft reviews can be edited.");
    }
    const publicReview = this.validateReviewPayload({ ...review, overall_rating: Number(review.overall_rating), ...changes });
    if (changes.category_ratings !== undefined && Object.keys(changes.category_ratings).length) {
      const supported = await this.repository.findActiveCategoryKeys(review.review_type);
      if (Object.keys(changes.category_ratings).some((key) => !supported.has(key))) {
        throw new BadRequestException("Unsupported rating category.");
      }
    }
    const fields = { updated_at: this.now() };
    for (const key of keys) {
      if (key === "category_ratings") continue;
      const value = changes[key];
      if (key === "public_review") {
        fields[key] = this.normalizePublicReview(value);
      } else if (key === "private_feedback") {
        fields[key] = this.normalizeOptionalText(value);
      } else {
        fields[key] = typeof value === "string" ? value.trim() : value;
      }
    }
    if (Object.hasOwn(changes, "public_review")) fields.public_review = publicReview;
    const updated = await this.repository.updateDraft({ reviewId: review.id, reviewerUserId: userId,
      expectedUpdatedAt: review.updated_at, fields, categoryRatings: changes.category_ratings });
    if (!updated) throw new ConflictException("Review changed. Reload it before editing.");
    return toReviewView(updated);
  }

  // Expose private feedback only to authorized users.
  // This keeps guest notes visible to the right audience without leaking them to the public review feed.
  async getPrivateFeedback(userId, reviewId) {
    this.assertCaller(userId);
    const review = await this.requireReview(reviewId);
    if (!(await this.canReadPrivateFeedback({ userId, review }))) {
      throw new ForbiddenException("You cannot access this private feedback.");
    }
    return { review_id: review.id, private_feedback: review.private_feedback };
  }

  // Create a host response for a review.
  // This supports the public reply flow while enforcing the host-only access rules for the review.
  async createReviewResponse(userId, reviewId, data) {
    this.assertCaller(userId);
    const message = this.validateResponse(data);
    const review = await this.requireReview(reviewId);
    assertHostResponseAccess(review, userId);
    const timestamp = this.now();
    const response = await this.repository.createResponse({ id: randomUUID(), reviewId: review.id,
      authorId: userId, authorRole: "host", status: "published", message, createdAt: timestamp,
      updatedAt: timestamp, publishedAt: timestamp, deletedAt: null });
    return toResponseView(response);
  }

  // Update an existing host reply.
  // This keeps the response editable after publication without allowing unrelated users to change it.
  async updateReviewResponse(userId, reviewId, data) {
    this.assertCaller(userId);
    const message = this.validateResponse(data);
    const review = await this.requireReview(reviewId);
    assertHostResponseAccess(review, userId);
    const response = await this.repository.updateResponse({ reviewId: review.id, authorId: userId,
      message, updatedAt: this.now() });
    if (!response) throw new NotFoundException("Review response not found.");
    return toResponseView(response);
  }

  // Delete a host response in a controlled way.
  // This removes the reply while preserving the review history and validating that the host is still authorized.
  async deleteReviewResponse(userId, reviewId) {
    this.assertCaller(userId);
    const review = await this.requireReview(reviewId);
    assertHostResponseAccess(review, userId);
    if (!(await this.repository.softDeleteResponse({ reviewId: review.id, authorId: userId, deletedAt: this.now() }))) {
      throw new NotFoundException("Review response not found.");
    }
  }

  // Publish a draft review when the reservation is still valid.
  // This finalizes the guest review only after the booking checks and authorization rules confirm it is eligible.
  async publishReview(userId, reviewId) {
    this.assertCaller(userId);
    const review = await this.requireReview(reviewId);
    if (!(await this.canPublishReview({ userId, review }))) throw new ForbiddenException("You cannot publish this review.");
    if (isPublished(review)) return toReviewView(review);
    if (review.status !== "DRAFT" || review.publication_status !== "UNPUBLISHED") {
      throw new ConflictException("Review cannot be published in its current state.");
    }
    this.validateReviewPayload({ ...review, overall_rating: Number(review.overall_rating) });
    const booking = await this.repository.findBookingById(review.booking_id);
    this.assertPublicationBooking(booking, review, this.now());
    const published = await this.repository.publishDraft({ reviewId: review.id,
      expectedUpdatedAt: review.updated_at, updatedAt: this.now(),
      authorize: (current) => this.canPublishReview({ userId, review: current }) });
    if (!published) throw new ConflictException("Review changed. Reload it before publishing.");
    return toReviewView(published);
  }

  assertPublicationBooking(booking, review, now) {
    assertEligibleBooking(booking, review.reviewer_user_id, now);
    if (String(booking.property_id) !== String(review.property_id) || String(booking.hostid) !== String(review.host_id)) {
      throw new ConflictException("The reservation is no longer eligible for publication.");
    }
  }

  async requireReview(reviewId) {
    this.assertId(reviewId, "review ID");
    const review = await this.repository.findById(reviewId.trim());
    if (!review || ["DELETED", "REJECTED"].includes(review.status)) throw new NotFoundException("Review not found.");
    return review;
  }

  assertCaller(userId) {
    if (typeof userId !== "string" || !userId.trim()) throw new UnauthorizedException("An authenticated caller is required.");
  }

  assertId(value, name) {
    if (typeof value !== "string" || !value.trim() || value.trim().length > 255) {
      throw new BadRequestException(`A valid ${name} is required.`);
    }
  }

  assertObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new BadRequestException("Request body must be a JSON object.");
  }

  validateResponse(data) {
    this.assertObject(data);
    if (Object.keys(data).some((key) => key !== "message") || typeof data.message !== "string" || !data.message.trim()) {
      throw new BadRequestException("Provide a non-empty message field.");
    }
    return data.message.trim();
  }

  // Create a new guest review for a completed reservation.
  // This enforces booking eligibility and prevents duplicate or invalid review submissions.
  async createReview(callerUserId, reviewData) {
    this.assertCaller(callerUserId);
    const publicReview = this.validateReviewPayload(reviewData);

    const bookingId = reviewData.booking_id.trim();
    const booking = await this.repository.findBookingById(bookingId);

    if (!booking) {
      throw new NotFoundException("Reservation not found.");
    }

    if (String(booking.guestid) !== String(callerUserId)) {
      throw new ForbiddenException("You can only review your own reservation.");
    }

    if (String(booking.hostid) === String(callerUserId)) {
      throw new ForbiddenException("You cannot review your own property.");
    }

    const now = this.now();
    const stayError = completedStayError(booking, now);
    if (stayError) throw new BadRequestException(stayError);

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
        throw new ConflictException(
          "This reservation already has a review."
        );
      }

      throw error;
    }
  }

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

  // Map a guest's own review to history fields, including response and editability.
  guestHistoryItem(review, timestamp) {
    const deadline = this.editDeadline(review);
    return { id: review.id, property_id: review.property_id, property_name: review.property_name,
      title: review.title, overall_rating: Number(review.overall_rating), public_review: review.public_review,
      created_at: Number(review.created_at), updated_at: Number(review.updated_at), status: review.status,
      publication_status: review.publication_status, verification_status: review.verification_status,
      category_ratings: review.categoryRatings || {},
      response: review.response ? { message: review.response.message, published_at: review.response.publishedAt } : null,
      can_edit: timestamp >= Number(review.created_at) && timestamp < deadline, edit_expires_at: deadline || null };
  }

  async getGuestReviewHistory(callerUserId, query = {}) {
    if (typeof callerUserId !== "string" || !callerUserId.trim()) throw new UnauthorizedException("A verified guest identity is required.");
    if (Object.keys(query).some((key) => !["scope", "offset"].includes(key))) {
      throw new BadRequestException("Unsupported review history parameter.");
    }
    const offset = query.offset ?? "0";
    if (typeof offset !== "string" || !/^(0|[1-9]\d*)$/.test(offset)
      || !Number.isSafeInteger(Number(offset)) || Number(offset) > 100000) {
      throw new BadRequestException("Invalid review history offset.");
    }
    const rows = await this.repository.findGuestReviewHistory(callerUserId, { offset: Number(offset) });
    const timestamp = this.now();
    return { reviews: rows.slice(0, 10).map((review) => this.guestHistoryItem(review, timestamp)),
      next_offset: rows.length > 10 ? Number(offset) + 10 : null };
  }

  async getGuestReviewDetail(callerUserId, reviewId) {
    if (typeof callerUserId !== "string" || !callerUserId.trim()) throw new UnauthorizedException("A verified guest identity is required.");
    if (typeof reviewId !== "string" || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(reviewId)) {
      throw new BadRequestException("A valid review ID is required.");
    }
    const reviews = await this.repository.findGuestReviewHistory(callerUserId, { id: reviewId });
    if (!reviews.length) throw new NotFoundException("Review not found.");
    return this.guestHistoryItem(reviews[0], this.now());
  }

}
