export const REVIEW_APPROVER_ROLES = Object.freeze([
  "Guest Experience Manager", "Property Operations Manager", "Reservation Manager", "General Manager",
]);
export const reviewAdministratorAllowlist = () =>
  String(process.env.PROPERTY_REVIEW_ADMIN_USER_IDS || "").split(/[,\s;]+/).filter(Boolean);
export const isReviewAdministrator = username =>
  typeof username === "string" && reviewAdministratorAllowlist().includes(username.trim());
