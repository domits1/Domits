import { BadRequestException } from "../util/exception/badRequestException.js";

export const TREND_PAGE_SIZE = 25;
const DAY_MS = 86_400_000;
export const TREND_STATUSES = ["DECLINING", "IMPROVING", "STABLE", "INSUFFICIENT_DATA"];

export function readTrendPolicy(env = process.env) {
  const threshold = Number(env.REVIEW_DECLINE_THRESHOLD);
  const minimumReviews = Number(env.REVIEW_TREND_MIN_REVIEWS);
  if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 4
    || !Number.isSafeInteger(minimumReviews) || minimumReviews < 1) {
    throw new Error("Review trend policy is not configured.");
  }
  return { threshold, minimumReviews };
}

function integerParameter(value, name, maximum) {
  if (typeof value !== "string" || !/^(0|[1-9]\d*)$/.test(value)
    || !Number.isSafeInteger(Number(value)) || Number(value) > maximum) {
    throw new BadRequestException(`Invalid ${name}.`);
  }
  return Number(value);
}

export function parseTrendQuery(query, now) {
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
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  const endExclusive = endDate + DAY_MS;
  if (endExclusive > today.getTime()) throw new BadRequestException("endDate must be before today in UTC.");
  if (query.status !== undefined && !TREND_STATUSES.includes(query.status)) {
    throw new BadRequestException("Invalid trend status.");
  }
  const sort = query.sort ?? "property-id";
  if (!["property-id", "declining-first"].includes(sort)) throw new BadRequestException("Invalid trend sort.");
  const currentStart = endExclusive - days * DAY_MS;
  return { days, offset, status: query.status, sort, endExclusive, currentStart,
    previousStart: currentStart - days * DAY_MS };
}

export function classifyTrend(previous, current, { threshold, minimumReviews }) {
  if (previous.review_count < minimumReviews || current.review_count < minimumReviews
    || !Number.isFinite(previous.overall_score) || !Number.isFinite(current.overall_score)) {
    return { rating_change: null, trend_status: "INSUFFICIENT_DATA" };
  }
  const change = current.overall_score - previous.overall_score;
  const boundary = threshold * (1 - 1e-12);
  if (change <= -boundary) return { rating_change: change, trend_status: "DECLINING" };
  if (change >= boundary) return { rating_change: change, trend_status: "IMPROVING" };
  return { rating_change: change, trend_status: "STABLE" };
}
