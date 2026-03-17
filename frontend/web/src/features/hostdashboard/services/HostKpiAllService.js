import { getAccessToken } from "../../../../src/services/getAccessToken.js";

const BASE_URL = "https://3biydcr59g.execute-api.eu-north-1.amazonaws.com/default/";

export const HostKpiAllService = {
  async fetchAll(hostId, filterType, startDate, endDate) {
    if (!hostId) throw new Error("Host ID is missing");
    const effectiveFilterType = filterType ?? "monthly";
    const token = await getAccessToken();

    const formatDate = (isoDate) => {
      if (!isoDate) return "";
      const [y, m, d] = isoDate.split("-");
      return `${d}-${m}-${y}`;
    };

    let url = `${BASE_URL}?hostId=${hostId}&metric=all&filterType=${effectiveFilterType}`;

    if (effectiveFilterType === "custom" && startDate && endDate) {
      url += `&startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`;
    }

    const response = await fetch(url, {
      headers: { Authorization: token },
    });

    // If backend returns a non-200 response, treat it as no data instead of an error
if (!response.ok) {
  console.warn("KPI fetch returned non-OK status:", response.status);
  return {};
}

let data = {};
try {
  data = await response.json();
} catch (error) {
  console.warn("Failed to parse KPI response JSON", error);
  return {};
}

if (data?.body) {
  try {
    data = JSON.parse(data.body);
  } catch (error) {
    console.warn("Failed to parse KPI response body", error);
    return {};
  }
}

// Always return an object so the dashboard shows "No data" instead of a fetch error
return data?.all ?? data ?? {};
  },
};