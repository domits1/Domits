import { ReviewGuestAlertCandidateService } from "../business/service/reviewGuestAlertCandidateService.js";
import { ADMIN_ALERT_TYPES, GUEST_ALERT_TYPES } from "../business/model/reviewAlertRules.js";
import { ReviewAdminAlertCandidateService } from "../business/service/reviewAdminAlertCandidateService.js";
import Database from "database";
import { Property } from "database/models/Property";
import { Review } from "database/models/Review";
import { Team_Member } from "database/models/Team_Member";

export class ReviewAlertRecipientRepository {
  async resolve(event) {
    if (Object.values(GUEST_ALERT_TYPES).includes(event.type)) {
      const candidates = await new ReviewGuestAlertCandidateService().evaluate(event);
      return candidates.filter(candidate => ["recipientUserId", "propertyId", "eventKey", "eventTimestamp"]
        .every(key => candidate[key] === event[key])).map(candidate => candidate.recipientUserId);
    }
    if (Object.values(ADMIN_ALERT_TYPES).includes(event.type)) {
      const candidates = await new ReviewAdminAlertCandidateService().evaluate({
        type: event.type, reviewId: event.reviewId, flagId: event.flagId,
      });
      return candidates.filter(candidate => candidate.recipientUserId === event.recipientUserId
        && candidate.propertyId === event.propertyId && candidate.eventKey === event.eventKey
        && candidate.eventTimestamp === event.eventTimestamp).map(candidate => candidate.recipientUserId);
    }
    const database = await Database.getInstance();
    const property = await database.getRepository(Property).findOne({ where: { id: event.propertyId } });
    if (!property?.hostid) return [];
    if (event.reviewId) {
      const review = await database.getRepository(Review).findOne({
        where: { id: event.reviewId, property_id: property.id, status: "PUBLISHED",
          publication_status: "PUBLISHED", review_type: "GUEST_TO_PROPERTY" },
        select: ["id", "overall_rating"],
      });
      if (!review) return [];
    }
    const managers = await database.getRepository(Team_Member).find({ where: {
      host_id: property.hostid, status: "active", role: "Property Operations Manager",
    } });
    return [...new Set([property.hostid, ...managers.map(member => member.member_user_id)].filter(Boolean))];
  }
}
