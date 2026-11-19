export const PROPERTY_REVIEW_ADMIN_ROUTE = "admin/property-review";
export const PROPERTY_REVIEW_LIST_PATH = `/hostdashboard/${PROPERTY_REVIEW_ADMIN_ROUTE}`;

export const propertyReviewDetailPath = (propertyId) =>
  `${PROPERTY_REVIEW_LIST_PATH}/${encodeURIComponent(propertyId)}`;
