import { getAccessToken } from "../../../../services/getAccessToken";
import { PROPERTY_API_BASE } from "../../hostproperty/constants";

const RATE_PLAN_URL = `${PROPERTY_API_BASE}/website/rate-plan`;

const readResponse = async (response) => {
  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      (typeof data === "string" && data) ||
      data?.message ||
      data?.error ||
      `Website rate plan request failed (${response.status}).`;
    throw new Error(message);
  }

  return data;
};

const getAuthorizationHeaders = () => {
  const token = getAccessToken();

  if (!token) {
    throw new Error("You must be signed in to manage your website rate plan.");
  }

  return {
    Authorization: token,
    "Content-Type": "application/json",
  };
};

export const getWebsiteRatePlan = async () => {
  const response = await fetch(RATE_PLAN_URL, {
    method: "GET",
    headers: getAuthorizationHeaders(),
  });

  return readResponse(response);
};

export const changeWebsiteRatePlan = async (plan) => {
  if (!["essentials", "elite"].includes(plan)) {
    throw new Error("Unsupported website rate plan.");
  }

  const response = await fetch(RATE_PLAN_URL, {
    method: "PATCH",
    headers: getAuthorizationHeaders(),
    body: JSON.stringify({ plan }),
  });

  return readResponse(response);
};
