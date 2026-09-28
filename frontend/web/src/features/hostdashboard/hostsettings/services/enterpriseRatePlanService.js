import {
  getAccessToken,
  getCognitoUserId,
} from "../../../../services/getAccessToken";

const BASE_URL =
  "https://3biydcr59g.execute-api.eu-north-1.amazonaws.com/default/";

export const getEnterpriseRatePlan = async () => {
  const token = getAccessToken();

  if (!token) {
    throw new Error("You must be signed in to load the enterprise rate plan.");
  }

  const enterpriseId = getCognitoUserId();

  if (!enterpriseId) {
    throw new Error("No enterprise account could be identified.");
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

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      "Failed to retrieve enterprise rate plan (" + response.status + ")"
    );
  }

  const data = await response.json();

  return {
    enterpriseId,
    ...data,
  };
};
