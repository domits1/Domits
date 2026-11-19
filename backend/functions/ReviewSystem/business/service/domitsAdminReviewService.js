import { assertCaller, requireReview } from "../model/reviewRules.js";
import { ForbiddenException } from "../../util/exception/forbiddenException.js";

export class DomitsAdminReviewService {
  constructor({ repository, canReadPrivateFeedback }) {
    this.repository = repository;
    this.canReadPrivateFeedback = canReadPrivateFeedback;
  }

  // Expose private feedback only to authorized users.
  // This keeps guest notes visible to the right audience without leaking them to the public review feed.
  async getPrivateFeedback(userId, reviewId) {
    assertCaller(userId);
    const review = await requireReview(this.repository, reviewId);
    if (!(await this.canReadPrivateFeedback({ userId, review }))) {
      throw new ForbiddenException("You cannot access this private feedback.");
    }
    return { review_id: review.id, private_feedback: review.private_feedback };
  }
}
