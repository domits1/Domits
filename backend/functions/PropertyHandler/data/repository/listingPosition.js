import { Property } from "database/models/Property";
import { Property_Moderation_Event } from "database/models/Property_Moderation_Event";
import { TypeException } from "../../util/exception/TypeException.js";

const APPROVAL_ALIAS = "approval";
const APPROVED_ACTION_PARAMETER = "approvedAction";
const APPROVED_ACTION = "APPROVED";

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
          .where(`event.action = :${APPROVED_ACTION_PARAMETER}`, { [APPROVED_ACTION_PARAMETER]: APPROVED_ACTION })
          .groupBy("event.propertyId"),
      APPROVAL_ALIAS,
      `${APPROVAL_ALIAS}.property_id = property.id`
    )
    .addSelect(APPROVED_AT_EXPRESSION, APPROVED_AT_ALIAS);

// Oldest approval first puts newly approved listings at the bottom; ties fall back to newest listing first.
export const orderByListingPosition = (query) =>
  query.orderBy(APPROVED_AT_ALIAS, "ASC").addOrderBy("property.createdat", "DESC").addOrderBy("property.id", "DESC");

// Where a property sits in the feed, read from the row itself. A pagination cursor carries only the id, so the
// position can never disagree with the sort. One row, so a correlated lookup is cheaper here than the aggregate.
// The driver returns bigint as text, hence Number().
//
// The optional scope adds the feed's own join and filter to this lookup (a function from builder to builder), so a
// cursor row outside the feed is treated like a row that does not exist. Without it, an id from another feed would be
// accepted and the page would silently skip or restart. A scope should not filter on status: a listing archived
// partway through a walk should still be a valid place to continue from.
export const findListingPosition = async (client, propertyId, scope = (lookup) => lookup) => {
  const query = client.getRepository(Property).createQueryBuilder("property");
  const approvedAt = query
    .subQuery()
    .select("COALESCE(MAX(event.createdAt), 0)")
    .from(Property_Moderation_Event, "event")
    .where("event.propertyId = property.id")
    .andWhere(`event.action = :${APPROVED_ACTION_PARAMETER}`)
    .getQuery();
  const lookup = query
    .select(["property.id", "property.createdat"])
    .addSelect(approvedAt, APPROVED_AT_ALIAS)
    .where("property.id = :id", { id: propertyId })
    .setParameter(APPROVED_ACTION_PARAMETER, APPROVED_ACTION);
  const row = await scope(lookup).getRawOne();

  // A scope that replaced or widened the id filter (where() or orWhere() in place of andWhere()) would hand back some
  // other row. Refusing any row but the one asked for makes that a null, and so a 400, and not a wrong page.
  if (!row || row.property_id !== propertyId) {
    return null;
  }
  return { approvedAt: Number(row.approved_at), createdAt: Number(row.property_createdat), id: row.property_id };
};

// Keyset predicate for the order above (approved ASC, createdat DESC, id DESC). Postgres cannot read the
// approved_at select alias inside WHERE, so the expression is repeated. COALESCE means no NULL branch.
export const afterListingPosition = (query, position) =>
  query.andWhere(
    `(${APPROVED_AT_EXPRESSION} > :cursorApprovedAt` +
      ` OR (${APPROVED_AT_EXPRESSION} = :cursorApprovedAt AND property.createdat < :cursorCreatedAt)` +
      ` OR (${APPROVED_AT_EXPRESSION} = :cursorApprovedAt AND property.createdat = :cursorCreatedAt` +
      " AND property.id < :cursorId))",
    { cursorApprovedAt: position.approvedAt, cursorCreatedAt: position.createdAt, cursorId: position.id }
  );

// The cursor step both guest feeds share. A request carries a cursor when it has a createdAt and an id: the controller
// turns a missing or "null" value into NaN, so those mean page 1. Only the id steers the page. createdAt marks that a
// cursor was sent, and the position is read back from the row, so a stale or forged value cannot skip or repeat
// listings. A cursor row that is missing, or that the scope rules out, is a 400 and not a restart at page 1.
export const applyListingCursor = async (client, query, cursor, scope) => {
  if (!(cursor?.createdAt && cursor?.id)) {
    return query;
  }
  const position = await findListingPosition(client, cursor.id, scope);
  if (!position) {
    throw new TypeException("Unknown pagination cursor.");
  }
  return afterListingPosition(query, position);
};
