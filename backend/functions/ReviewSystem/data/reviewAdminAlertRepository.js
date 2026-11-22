import Database from "database";
import { Review } from "database/models/Review";
import { Review_Flag } from "database/models/Review_Flag";
import { Team_Member } from "database/models/Team_Member";
import { REVIEW_APPROVER_ROLES, isReviewAdministrator } from "../auth/reviewAdministrator.js";

// Same global scope as ReviewRepository.hasActiveReviewApproverRole and the admin queues.
export class ReviewAdminAlertRepository {
  constructor({ getDatabase = () => Database.getInstance() } = {}) { this.getDatabase = getDatabase; }

  async load(reviewId, flagId) {
    const database = await this.getDatabase();
    const review = await database.getRepository(Review).findOne({ where: { id: reviewId },
      select: ["id", "property_id", "review_type", "status", "publication_status", "updated_at"] });
    const flag = flagId ? await database.getRepository(Review_Flag).findOne({
      where: { id: flagId, review_id: reviewId, status: "PENDING" },
      select: ["id", "review_id", "status", "created_at"],
    }) : undefined;
    const members = await database.getRepository(Team_Member).find({ where: { status: "active" },
      select: ["member_user_id", "status", "role"] });
    const recipients = [...new Set(members.filter(member => member.status === "active"
      && REVIEW_APPROVER_ROLES.includes(member.role) && isReviewAdministrator(member.member_user_id))
      .map(member => member.member_user_id.trim()))];
    return { review, flag, recipients };
  }
}
