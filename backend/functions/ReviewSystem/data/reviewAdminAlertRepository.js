import { In } from "typeorm";
import { Review_Alert_Work } from "database/models/Review_Alert_Work";
import { adminReviewAlertWorkId } from "./reviewAlertWorkRepository.js";
import Database from "database";
import { Review } from "database/models/Review";
import { Review_Flag } from "database/models/Review_Flag";
import { Team_Member } from "database/models/Team_Member";
import { REVIEW_APPROVER_ROLES, isReviewAdministrator, reviewAdministratorAllowlist } from "../auth/reviewAdministrator.js";

// Same global scope as ReviewRepository.hasActiveReviewApproverRole and the admin queues.
export class ReviewAdminAlertRepository {
  constructor({ getDatabase = () => Database.getInstance() } = {}) { this.getDatabase = getDatabase; }

  async load(reviewId, flagId, type) {
    const allowlist = reviewAdministratorAllowlist();
    if (!allowlist.length) return { recipients: [] };
    const database = await this.getDatabase();
    const review = await database.getRepository(Review).findOne({ where: { id: reviewId },
      select: ["id", "property_id", "review_type", "status", "publication_status", "updated_at"] });
    if (!review) return { recipients: [] };
    const work = await database.getRepository(Review_Alert_Work).findOneBy({ id: adminReviewAlertWorkId(type, reviewId, flagId) });
    if (!work) return { recipients: [] };
    const event = JSON.parse(work.payload);
    if (event.phase !== "admin" || event.type !== type || event.reviewId !== reviewId
      || event.flagId !== flagId) return { recipients: [] };
    const flag = flagId ? await database.getRepository(Review_Flag).findOne({
      where: { id: flagId, review_id: reviewId, status: "PENDING" },
      select: ["id", "review_id", "status", "created_at"],
    }) : undefined;
    const members = await database.getRepository(Team_Member).find({ where: { status: "active", role: In(REVIEW_APPROVER_ROLES), member_user_id: In(allowlist) },
      select: ["member_user_id", "status", "role"] });
    const recipients = [...new Set(members.filter(member => member.status === "active"
      && REVIEW_APPROVER_ROLES.includes(member.role) && isReviewAdministrator(member.member_user_id))
      .map(member => member.member_user_id.trim()))];
    return { review, flag, recipients, eventTimestamp: event.eventTimestamp };
  }
}
