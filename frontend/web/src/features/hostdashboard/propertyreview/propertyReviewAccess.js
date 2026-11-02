import { PROPERTY_API_BASE } from "../../../services/propertyApiConfig";
import { getAccessToken } from "../../../services/getAccessToken";

export const PROPERTY_REVIEW_ADMIN_ROUTE = "admin/property-review";

export const checkPropertyReviewAccess = async () => {
  const accessToken = getAccessToken();
  if (!accessToken) return false;

  try {
    const response = await fetch(`${PROPERTY_API_BASE}/review/access`, {
      method: "GET",
      headers: { Authorization: accessToken },
    });
    if (!response.ok) return false;

    const body = await response.json();
    return body?.allowed === true;
  } catch {
    return false;
  }
};
