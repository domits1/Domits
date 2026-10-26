const REVIEWER_ROLES = new Set([
    "Admin",
    "Host",
    "General Manager",
    "Reservation Manager",
    "Guest Experience Manager",
    "Financial Manager",
    "Distribution Manager",
    "Revenue Manager",
    "Sales Manager",
    "Property Operations Manager",
]);

export const canReviewCompletedTasks = (role) => REVIEWER_ROLES.has(role);
