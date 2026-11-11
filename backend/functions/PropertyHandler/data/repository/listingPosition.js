import { Property_Moderation_Event } from "database/models/Property_Moderation_Event";

const APPROVAL_ALIAS = "approval";
const APPROVED_ACTION_PARAMETER = "approvedAction";

// Zero stands for "never approved", so those listings sort ahead of every approved one.
export const APPROVED_AT_EXPRESSION = `COALESCE(${APPROVAL_ALIAS}.approved_at, 0)`;
export const APPROVED_AT_ALIAS = "approved_at";

// One aggregation of the whole event table, joined once, instead of a correlated lookup per property row.
// The unbounded guest feeds sort every active property on each page, so a per-row lookup costs far more there.
export const joinLatestApproval = (query) =>
  query
    .leftJoin(
      (latestApprovals) =>
        latestApprovals
          .select("event.propertyId", "property_id")
          .addSelect("MAX(event.createdAt)", "approved_at")
          .from(Property_Moderation_Event, "event")
          .where(`event.action = :${APPROVED_ACTION_PARAMETER}`, { [APPROVED_ACTION_PARAMETER]: "APPROVED" })
          .groupBy("event.propertyId"),
      APPROVAL_ALIAS,
      `${APPROVAL_ALIAS}.property_id = property.id`
    )
    .addSelect(APPROVED_AT_EXPRESSION, APPROVED_AT_ALIAS);

// Oldest approval first puts newly approved listings at the bottom; ties fall back to newest listing first.
export const orderByListingPosition = (query) =>
  query.orderBy(APPROVED_AT_ALIAS, "ASC").addOrderBy("property.createdat", "DESC").addOrderBy("property.id", "DESC");
