import { classifyTrend } from "../../functions/ReviewSystem/business/ratingTrends.js";

test.each([
  [4.5, 4, 3, 3, "DECLINING", -0.5],
  [4, 4.5, 3, 3, "IMPROVING", 0.5],
  [4, 4.25, 3, 3, "STABLE", 0.25],
  [4, 4, 3, 3, "STABLE", 0],
  [null, 4, 0, 3, "INSUFFICIENT_DATA", null],
  [4.5, 4, 2, 3, "INSUFFICIENT_DATA", null],
  [4.5, null, 3, 0, "INSUFFICIENT_DATA", null],
])("classifies %s to %s with %s/%s reviews", (previous, current, previousCount, currentCount, status, change) => {
  expect(classifyTrend({ overall_score: previous, review_count: previousCount },
    { overall_score: current, review_count: currentCount }, { threshold: 0.5, minimumReviews: 3 }))
    .toEqual({ rating_change: change, trend_status: status });
});
