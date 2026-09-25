import {
  getAccessToken,
  getCognitoUserId,
} from "../../../../services/getAccessToken";
import { fetchHostOwnedListings } from "../../services/hostTaskPropertyService";

const BASE_URL =
  "https://3biydcr59g.execute-api.eu-north-1.amazonaws.com/default/";

const getEnterpriseIdFromListings = async () => {
  const listings = await fetchHostOwnedListings();

  return (
    listings
      .map(
        (listing) =>
          listing?.property?.enterpriseid ||
          listing?.property?.enterpriseId ||
          listing?.enterpriseid ||
          listing?.enterpriseId
      )
      .find(Boolean) || null
  );
};

export const getEnterpriseRatePlan = async () => {
  const explicitEnterpriseId = await getEnterpriseIdFromListings();
  const enterpriseId = explicitEnterpriseId || getCognitoUserId();

  if (!enterpriseId) {
    throw new Error("No enterprise account could be identified.");
  }

  const token = getAccessToken();

  if (!token) {
    throw new Error("You must be signed in to load the enterprise rate plan.");
  }

  const response = await fetch(
    BASE_URL + "enterprise/" + encodeURIComponent(enterpriseId),
    {
      method: "GET",
      headers: {
        Authorization: token,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to retrieve enterprise rate plan (${response.status})`
    );
  }

  const data = await response.json();

  return {
    enterpriseId,
    ...data,
  };
};
