// Review: Response lifecycle values and host-side roles allowed to manage public replies.
export const REVIEW_RESPONSE_STATUSES = Object.freeze({
  DRAFT: "draft",
  PUBLISHED: "published",
});

export const HOST_RESPONSE_ROLES = new Set([
  "host",
  "property manager",
  "property_manager",
  "property operations manager",
  "property_operations_manager",
  "team member",
  "team_member",
  "cohost",
  "co-host",
]);
