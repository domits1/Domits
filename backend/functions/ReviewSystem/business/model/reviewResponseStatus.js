// Review: Response lifecycle values and host-side roles allowed to manage public replies.
export const REVIEW_RESPONSE_STATUSES = Object.freeze({
  DRAFT: "draft",
  PUBLISHED: "published",
});

// Roles permitted to create and manage public host responses.
// Both spaced and underscored names support differing role formats.
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
