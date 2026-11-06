import { PROPERTY_API_BASE } from "../../hostproperty/constants";
import { fetchWithWebsiteSession } from "../../website/services/websiteSession";

const RATE_PLAN_URL = `${PROPERTY_API_BASE}/website/rate-plan`;
const JSON_HEADERS = Object.freeze({ "Content-Type": "application/json" });

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

export const getWebsiteRatePlan = async () => {
  const response = await fetchWithWebsiteSession(RATE_PLAN_URL, {
    method: "GET",
    headers: JSON_HEADERS,
  });

  return readResponse(response);
};

export const changeWebsiteRatePlan = async (plan) => {
  if (!["essentials", "elite"].includes(plan)) {
    throw new Error("Unsupported website rate plan.");
  }

  const response = await fetchWithWebsiteSession(RATE_PLAN_URL, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify({ plan }),
  });

  return readResponse(response);
};
