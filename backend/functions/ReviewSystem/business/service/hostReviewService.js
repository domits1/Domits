import { readTrendPolicy, parseTrendQuery, TREND_PAGE_SIZE } from "../model/ratingTrends.js";
import { assertId, INVALID_TEXT_CONTROLS } from "../model/reviewRules.js";
import { BadRequestException } from "../../util/exception/badRequestException.js";
import { NotFoundException } from "../../util/exception/notFoundException.js";
import { UnauthorizedException } from "../../util/exception/unauthorizedException.js";

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

export class HostReviewService {
  constructor({ repository, now }) {
    this.repository = repository;
    this.now = now;
  }

  async saveHostResponse(user, reviewId, body, action) {
    this.assertHostResponseIdentity(user);
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

  async authorizeManagedProperty(callerUserId, propertyId) {
    if (typeof callerUserId !== "string" || !callerUserId.trim()) {
      throw new UnauthorizedException("A verified user identity is required.");
    }
    if (typeof propertyId !== "string" || !propertyId.trim()) {
      throw new BadRequestException("A property ID is required.");
    }
    assertId(propertyId, "property ID");
    const normalizedPropertyId = propertyId.trim();
    const property = await this.repository.findManagedProperty(normalizedPropertyId, callerUserId);
    if (!property) throw new NotFoundException("Property not found or access is denied.");
    return normalizedPropertyId;
  }

  async getPropertyRatingTrends(username, query = {}) {
    if (typeof username !== "string" || !username.trim()) {
      throw new UnauthorizedException("A verified user identity is required.");
    }
    const policy = readTrendPolicy();
    const options = parseTrendQuery(query, this.now());
    const { days, offset, previousStart, currentStart } = options;
    const { threshold, minimumReviews } = policy;
    const rows = await this.repository.getPropertyRatingTrendPage(username, { ...options, ...policy });
    const trends = rows.slice(0, TREND_PAGE_SIZE).map((row) => ({
      property_id: row.property_id,
      current_average_rating: row.current_average_rating,
      previous_average_rating: row.previous_average_rating,
      current_review_count: row.current_review_count,
      previous_review_count: row.previous_review_count,
      rating_change: row.rating_change,
      trend_status: row.trend_status,
    }));
    const dateLabel = (timestamp) => new Date(timestamp).toISOString().slice(0, 10);
    if (trends.length) {
      try {
        const historyRows = await this.repository.getPropertyRatingHistory(username, trends.map((property) => property.property_id), options);
        const historyByProperty = new Map();
        for (const row of historyRows) {
          if (!historyByProperty.has(row.property_id)) historyByProperty.set(row.property_id, new Map());
          historyByProperty.get(row.property_id).set(row.period_index, row);
        }
        const periodMs = days * DAY_MS;
        for (const property of trends) {
          property.history = Array.from({ length: 6 }, (_, index) => {
            const start = options.endExclusive - (6 - index) * periodMs;
            const row = historyByProperty.get(property.property_id)?.get(index);
            return { start_date: dateLabel(start), end_date: dateLabel(start + periodMs - DAY_MS),
              average_rating: row?.average_rating ?? null, review_count: row?.review_count ?? 0 };
          });
        }
      } catch (error) {
        console.error("ReviewSystem rating history failed:", error);
        for (const property of trends) property.history = null;
      }
    }
    return { timezone: "UTC", days, decline_threshold: threshold, minimum_reviews_per_period: minimumReviews,
      previous_period: { start_date: dateLabel(previousStart), end_date: dateLabel(currentStart - DAY_MS) },
      current_period: { start_date: dateLabel(currentStart), end_date: query.endDate },
      properties: trends, next_offset: rows.length > TREND_PAGE_SIZE ? offset + TREND_PAGE_SIZE : null };
  }

  async getPropertyReviewPerformance(userId, propertyId, query = {}) {
    const id = await this.authorizeManagedProperty(userId, propertyId);
    const interval = query.interval === undefined ? "month" : query.interval;
    if (!["week", "month", "year"].includes(interval)) {
      throw new BadRequestException("interval must be week, month, or year.");
    }
    const start = parsePerformanceDate(query.startDate, "startDate");
    const end = parsePerformanceDate(query.endDate, "endDate");
    if (start > end) throw new BadRequestException("startDate must not exceed endDate.");
    const endExclusive = end + DAY_MS;
    const buckets = generatePerformancePeriods(start, endExclusive, interval);
    const rows = await this.repository.getPropertyReviewPerformance(id, userId, start, endExclusive, interval);
    const byPeriod = new Map(rows.map((row) => [row.period, row]));
    const periods = buckets.map((bucket) => {
      const row = byPeriod.get(bucket.period);
      return { ...bucket, average_score: row ? Number(row.average_score) : null,
        review_count: row ? Number(row.review_count) : 0,
        rating_distribution: Object.fromEntries([1, 2, 3, 4, 5].map((stars) => [stars, Number(row?.[`stars_${stars}`] ?? 0)])) };
    });
    return { property_id: id, interval, timezone: "UTC", start_date: query.startDate,
      end_date: query.endDate, periods };
  }

  async getPropertyCategoryRatings(userId, propertyId) {
    const id = await this.authorizeManagedProperty(userId, propertyId);
    const categories = await this.repository.getPropertyCategoryRatings(id, userId);
    return { property_id: id, categories };
  }

  async getPropertyReviewScore(userId, propertyId) {
    const id = await this.authorizeManagedProperty(userId, propertyId);
    return this.repository.getPropertyReviewScore(id, userId);
  }

  async deleteReviewResponse(user, reviewId) {
    this.assertHostResponseIdentity(user);
    assertId(reviewId, "review ID");
    if (!(await this.repository.deleteHostResponse(user, reviewId.trim(), this.now()))) {
      throw new NotFoundException("Review response not found.");
    }
  }

  assertHostResponseIdentity(user) {
    if (typeof user?.username !== "string" || !user.username.trim() || typeof user.userId !== "string" || !user.userId.trim()) throw new UnauthorizedException("A verified host identity is required.");
  }
}
