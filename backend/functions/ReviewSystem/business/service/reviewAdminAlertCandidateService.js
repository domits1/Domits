import { ReviewAlertRules, ADMIN_ALERT_TYPES } from "../model/reviewAlertRules.js";
import { ReviewAdminAlertRepository } from "../../data/reviewAdminAlertRepository.js";

// Internal read-only boundary. Inputs are event references, never recipient IDs or review content.
export class ReviewAdminAlertCandidateService {
  constructor({ repository = new ReviewAdminAlertRepository() } = {}) { this.repository = repository; }

  async evaluate({ type, reviewId, flagId } = {}) {
    const validId = value => typeof value === "string" && value.trim() === value && value.length > 0 && value.length <= 255;
    if (!Object.values(ADMIN_ALERT_TYPES).includes(type) || !validId(reviewId)
      || (type === ADMIN_ALERT_TYPES.REVIEW_FLAGGED && !validId(flagId))) return [];
    const data = await this.repository.load(reviewId, type === ADMIN_ALERT_TYPES.REVIEW_FLAGGED ? flagId : undefined);
    if (data.review?.id !== reviewId) return [];
    return ReviewAlertRules.administrator({ ...data, type });
  }
}
