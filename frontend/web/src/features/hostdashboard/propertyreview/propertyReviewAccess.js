import { getAccessToken } from "../../../services/getAccessToken";
import { requestPropertyReview } from "./services/propertyReviewApi";

export const PROPERTY_REVIEW_ADMIN_ROUTE = "admin/property-review";

export const PROPERTY_REVIEW_ACCESS = Object.freeze({
  ALLOWED: "allowed",
  DENIED: "denied",
  UNAVAILABLE: "unavailable",
});

export const checkPropertyReviewAccess = async () => {
  if (!getAccessToken()) return PROPERTY_REVIEW_ACCESS.DENIED;

  try {
    const body = await requestPropertyReview("/review/access");
    return body.allowed === true ? PROPERTY_REVIEW_ACCESS.ALLOWED : PROPERTY_REVIEW_ACCESS.DENIED;
  } catch {
    return PROPERTY_REVIEW_ACCESS.UNAVAILABLE;
  }
};
